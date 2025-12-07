/**
 * Intelligently split markdown content into chunks while preserving semantic structure
 */
export function chunkMarkdown(
  markdown: string,
  maxChunkSize: number = 1000
): string[] {
  if (!markdown) return [];

  // 1. Split by headers (h1, h2, h3) to keep sections together
  const sections = markdown.split(/^(#{1,3} .+)/gm).filter(Boolean);

  const chunks: string[] = [];
  let currentChunk = "";

  for (const section of sections) {
    // If adding this section exceeds max size, push current chunk and start new
    if (
      currentChunk.length + section.length > maxChunkSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
    }

    // If the section itself is too big, split it by paragraphs
    if (section.length > maxChunkSize) {
      const paragraphs = section.split(/\n\n+/);
      for (const paragraph of paragraphs) {
        if (
          currentChunk.length + paragraph.length > maxChunkSize &&
          currentChunk.length > 0
        ) {
          chunks.push(currentChunk.trim());
          currentChunk = "";
        }
        currentChunk += paragraph + "\n\n";
      }
    } else {
      currentChunk += section + "\n";
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split text safely ensuring no surrogate pairs are broken
 */
export function safeSplit(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + maxLength;
    if (end >= text.length) {
      chunks.push(text.slice(start));
      break;
    }
    // Check if we are splitting a surrogate pair
    // text.charCodeAt(end - 1) is the last char of the chunk
    // If it's a high surrogate, it means the next char (at 'end') is the low surrogate.
    // So we shouldn't split between end-1 and end.
    const charCode = text.charCodeAt(end - 1);
    if (charCode >= 0xd800 && charCode <= 0xdbff) {
      // High surrogate at the end, back off one char so we don't include it in this chunk
      // It will be included in the next chunk as the first char
      end--;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
