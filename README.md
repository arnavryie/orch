# 🌌 Orchestria

[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Engine-Playwright-green?logo=playwright)](https://playwright.dev/)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**Orchestria** is a high-performance, production-grade multi-AI orchestration dashboard. It aggregates world-class language models into a single, beautiful interface with real-time streaming, persistent session management, and powerful browser automation.

---

## ✨ Features

🚀 **Unified Dashboard**  
Access and manage prompts across multiple premium AIs from a single console.

⚡ **Real-Time Streaming (SSE)**  
Word-by-word response extraction providing a responsive, "live-typing" experience identical to native AI platforms.

🤖 **Browser Automation Engine**  
Powered by Playwright to maintain authenticated sessions, automate complex DOM interactions, and efficiently harvest responses.

📊 **Advanced Chaining & Tooling**  
- **YouTube Summarizer**: Effortlessly fetch transcripts and generate context-rich summaries.
- **Stateful Conversations**: Persistent storage utilizing `idb` and optional Supabase integrations.
- **Parallel Processing**: Deploy prompts to multiple engines simultaneously and orchestrate outputs.

🎨 **Premium UI/UX**  
Modern glassmorphism aesthetics, built with Tailwind v4 and buttery-smooth Framer Motion animations.

---

## 🧠 Supported Models

Orchestria integrates seamlessly via resilient, state-aware automation agents for:

- 🟢 **ChatGPT** (OpenAI)
- 🟠 **Claude** (Anthropic)
- 🔵 **Gemini** (Google)
- 🔴 **Perplexity**
- ⚫ **Grok** (x.com)

---

## 🛠️ Architecture

The system adopts a decoupled two-tier architecture:

1. **Frontend (`/src`)**: A React Server Components driven Next.js application responsible for rendering the console, managing client-side state, and streaming user updates.
2. **Backend (`automation-server.js`)**: An Express.js orchestration layer that interfaces directly with Headless Playwright instances. It encapsulates session logic, anti-detection handling, and incremental DOM polling strategies.

---

## 🚦 Getting Started

### Prerequisites

- **Node.js** (v20+ recommended)
- **npm** or **yarn**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/arnavryie/orch.git
   cd orch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Ensure required browsers are available for Playwright:
   ```bash
   npx playwright install chromium
   ```

### Environment Setup

Create a `.env.local` file in the root directory and insert your essential configuration settings (Supabase keys, API secrets, etc.):
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# Additional keys...
```

### Development

Orchestria utilizes `concurrently` to spin up both the Next.js development environment and the Node automation server with a single command:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser to launch the dashboard.

---

## 📂 Key Project Structure

```text
orch
├── automation-server.js      # Express + Playwright automation gateway
├── sessions/                 # Persistent browser contexts (Git-ignored)
├── public/                   # Assets and icons
└── src
    ├── app/                  # App Router structure
    │   ├── (console)/        # Main authenticated dashboard pages
    │   └── api/              # Internal API proxy routes (SSE handlers)
    ├── components/           # Reusable Framer Motion and Tailwind components
    └── lib/                  # Utility functions, DB wrappers, state stores
```

---

## 📜 License

Private repository for project development. All rights reserved.
