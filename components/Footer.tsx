export function Footer() {
  return (
    <footer className="relative bg-linear-to-b from-white via-slate-50 to-slate-100 py-12 border-t border-slate-200/60">
      {/* Subtle gradient orb */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-linear-to-t from-blue-500/10 via-violet-500/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container px-4 md:px-6 mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-linear-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" x2="12" y1="19" y2="22"></line>
              </svg>
            </div>
            <h3 className="text-2xl font-bold bg-linear-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              WebAgent
            </h3>
          </div>

          <nav>
            <ul className="flex flex-wrap justify-center md:justify-end gap-8 text-sm font-medium text-slate-600">
              <li>
                <a
                  href="#features"
                  className="hover:text-blue-600 transition-colors"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#how-it-works"
                  className="hover:text-blue-600 transition-colors"
                >
                  How it Works
                </a>
              </li>
              <li>
                <a
                  href="/playground"
                  className="hover:text-blue-600 transition-colors"
                >
                  Playground
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="pt-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">
            Transform any website into an intelligent voice AI agent.
          </p>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} WebAgent. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
