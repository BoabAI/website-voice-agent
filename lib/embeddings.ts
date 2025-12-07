import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "https://web-voice-agent.vercel.app", // Fallback URL
    "X-Title": "Web Voice Agent",
  },
});

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000; // 1 second

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Result from embedding generation including attempt stats
 */
export interface EmbeddingResult<T> {
  data: T;
  attempts: number;
}

/**
 * Make an embedding request with exponential backoff retry
 */
async function makeEmbeddingRequest(input: string | string[]): Promise<{
  response: OpenAI.Embeddings.CreateEmbeddingResponse;
  attempts: number;
}> {
  let lastError: Error | null = null;

  // Validate input
  let effectiveInput = input;
  let reorderMap: number[] | null = null;
  const originalLength = Array.isArray(input) ? input.length : 1;

  if (Array.isArray(input)) {
    const validInputs = input
      .map((s, i) => ({ text: s, index: i }))
      .filter((item) => item.text && item.text.trim().length > 0);

    if (validInputs.length === 0) {
      throw new Error("All input strings are empty or whitespace only");
    }

    if (validInputs.length < input.length) {
      console.warn(
        `[Embeddings] Filtered out ${
          input.length - validInputs.length
        } empty strings from batch`
      );
      effectiveInput = validInputs.map((v) => v.text);
      reorderMap = validInputs.map((v) => v.index);
    }
  } else if (!input || input.trim().length === 0) {
    throw new Error("Input string is empty or whitespace only");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: "openai/text-embedding-3-small",
        input: effectiveInput,
      });

      if (!response || !response.data) {
        console.error(
          `[Embeddings] Invalid response from API (Attempt ${attempt}):`,
          JSON.stringify(response, null, 2)
        );
        throw new Error("Invalid response from API: No data returned");
      }

      // If we filtered input, we need to map back to original indices
      // Note: OpenAI response indices correspond to the effectiveInput we sent
      if (reorderMap && Array.isArray(effectiveInput)) {
        // This logic is tricky because makeEmbeddingRequest returns the RAW response.
        // We should probably return the modified response here to match the contract.
        // But the raw response contains 'index' property in data items.
        // We need to remap those 'index' values to the original input indices.

        const remappedData = response.data.map((item) => ({
          ...item,
          index: reorderMap![item.index], // Map back to original index
        }));

        return {
          response: { ...response, data: remappedData },
          attempts: attempt,
        };
      }

      return { response, attempts: attempt };
    } catch (error) {
      lastError = error as Error;
      const delayMs = INITIAL_DELAY_MS * Math.pow(2, attempt - 1); // 1s, 2s, 4s

      // Detailed error logging
      const errorMessage = (error as any).response?.data
        ? JSON.stringify((error as any).response.data)
        : (error as Error).message;

      console.warn(
        `[Embeddings] Attempt ${attempt}/${MAX_RETRIES} failed. ` +
          `${
            attempt < MAX_RETRIES
              ? `Retrying in ${delayMs}ms...`
              : "No more retries."
          }`,
        errorMessage
      );

      if (attempt < MAX_RETRIES) {
        await sleep(delayMs);
      }
    }
  }

  console.error(`[Embeddings] All ${MAX_RETRIES} attempts failed.`);
  throw lastError;
}

export async function generateEmbeddings(
  text: string
): Promise<EmbeddingResult<number[]>>;
export async function generateEmbeddings(
  texts: string[]
): Promise<EmbeddingResult<number[][]>>;
export async function generateEmbeddings(
  input: string | string[]
): Promise<EmbeddingResult<number[]> | EmbeddingResult<number[][]>> {
  const { response, attempts } = await makeEmbeddingRequest(input);

  if (typeof input === "string") {
    return {
      data: response.data[0].embedding,
      attempts,
    };
  }

  // Ensure embeddings are returned in the same order as input
  const data = new Array(input.length).fill(null);

  // Note: If we filtered out items, they will remain null.
  // We can fill them with a zero-vector or leave them.
  // Since the return type is number[][], we should probably fill them
  // to avoid runtime errors in strictly typed consumers,
  // although empty strings shouldn't have been passed in the first place.
  // OpenAI text-embedding-3-small is 1536 dimensions.

  response.data.forEach((item) => {
    if (item.index < data.length) {
      data[item.index] = item.embedding;
    }
  });

  // Fill any holes (filtered items) with a zero-length array or similar to prevent crashes,
  // though semantic value is lost. Ideally, caller filters inputs.
  // For now, we trust the caller (scrape.ts) is fixed, but this safe-guards valid array access.
  for (let i = 0; i < data.length; i++) {
    if (!data[i]) {
      // Fallback for filtered/empty inputs
      data[i] = [];
    }
  }

  return { data: data as number[][], attempts };
}
