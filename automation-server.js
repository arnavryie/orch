const express = require('express')
const cors = require('cors')
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }))
app.use(express.json({ limit: '10mb' }))

const SESSIONS_DIR = path.join(__dirname, 'sessions')
if (!fs.existsSync(SESSIONS_DIR)) fs.mkdirSync(SESSIONS_DIR, { recursive: true })

const TIMEOUT = 180000
let loginBrowserInstance = null   // visible — used only for the Connect login flow
let promptBrowserInstance = null  // headless — used silently for all prompt/response

// ── Visible browser (login only) ─────────────────────────────────
async function getLoginBrowser() {
  if (!loginBrowserInstance || !loginBrowserInstance.isConnected()) {
    console.log('[Browser] Launching visible Edge for login...')
    loginBrowserInstance = await chromium.launch({
      channel: 'msedge',
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--start-maximized',
        '--lang=en-US'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
    })
    console.log('[Browser] Visible Edge launched')
  }
  return loginBrowserInstance
}

// ── Hidden browser (prompts) ──────────────────────────────────────
async function getPromptBrowser() {
  if (!promptBrowserInstance || !promptBrowserInstance.isConnected()) {
    console.log('[Browser] Launching hidden Edge for prompts...')
    promptBrowserInstance = await chromium.launch({
      channel: 'msedge',
      headless: true,  // ← completely invisible
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--lang=en-US'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
    })
    console.log('[Browser] Hidden Edge launched')
  }
  return promptBrowserInstance
}

async function getOrCreateContext(ai, useHeadless = false) {
  const browser = useHeadless ? await getPromptBrowser() : await getLoginBrowser()
  const sessionPath = path.join(SESSIONS_DIR, `${ai}.json`)
  const opts = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  }
  try {
    if (fs.existsSync(sessionPath)) {
      console.log(`[${ai}] Loading existing session...`)
      return await browser.newContext({ ...opts, storageState: sessionPath })
    }
  } catch (e) {
    console.log(`[${ai}] Session corrupt, fresh context`)
  }
  return await browser.newContext(opts)
}

async function trySelectorList(page, selectors, timeout = 8000) {
  for (const sel of selectors) {
    try {
      await page.waitForSelector(sel, { timeout })
      const el = page.locator(sel).first()
      if (await el.count() > 0) return el
    } catch {}
  }
  return null
}

async function saveContext(context, ai) {
  try {
    await context.storageState({ path: path.join(SESSIONS_DIR, `${ai}.json`) })
    console.log(`[${ai}] Session saved to disk ✓`)
  } catch (e) {
    console.log(`[${ai}] Could not save session: ${e.message}`)
  }
}

// ── Google OAuth auto-clicker ─────────────────────────────────────
// These are the "Continue with Google" button selectors for each platform
const GOOGLE_BTN_SELECTORS = {
  chatgpt: [
    'button[data-provider="google"]',
    'a[href*="google"][class*="social"]',
    '[data-testid="google-auth-button"]',
    'button:has-text("Continue with Google")',
    'button:has-text("Sign in with Google")',
    '.social-btn--google',
    '[aria-label*="Google"]'
  ],
  claude: [
    'button:has-text("Continue with Google")',
    'button:has-text("Sign in with Google")',
    '[data-provider="google"]',
    'a[href*="google_oauth"]',
    '.cl-socialButtonsIconButton[data-provider="google"]',
    'button[class*="google"]'
  ],
  gemini: [
    // Gemini goes straight to Google sign-in — no extra button needed
  ],
  perplexity: [
    'button:has-text("Continue with Google")',
    'button:has-text("Sign in with Google")',
    '[data-provider="google"]',
    'button[class*="google"]',
    'a[href*="google"][class*="social"]'
  ],
  grok: [
    'a[href*="google"]',
    'button:has-text("Sign in with Google")',
    'button:has-text("Continue with Google")',
    '[data-testid="google-signin-button"]',
    'div[data-testid="LoginForm_Login_Button"]'
  ]
}

// Selector that means "you are now logged in" for each AI
const LOGGED_IN_SELECTORS = {
  chatgpt: [
    '#prompt-textarea',
    'div[contenteditable][data-lexical-editor]',
    '[data-testid="send-button"]'
  ],
  claude: [
    'div[contenteditable="true"].ProseMirror',
    'div[contenteditable="true"][data-placeholder]',
    'fieldset div[contenteditable="true"]'
  ],
  gemini: [
    'div.ql-editor[contenteditable="true"]',
    'rich-textarea .ql-editor',
    'textarea[aria-label*="prompt"]'
  ],
  perplexity: [
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Search"]',
    '[contenteditable="true"][aria-label*="Ask"]',
    '.grow.py-2.outline-none',
    'textarea.overflow-auto'
  ],
  grok: [
    'textarea[placeholder*="Ask"]',
    'textarea[placeholder*="Grok"]',
    '[data-testid="tweetTextarea_0"]',
    'div[contenteditable="true"][data-testid]',
    '.public-DraftEditor-content'
  ]
}

// The starting URL for each AI's login page
// IMPORTANT: ChatGPT must go through chatgpt.com (not auth.openai.com directly)
// Going to auth.openai.com directly causes bot-detection timeouts
const LOGIN_URLS = {
  chatgpt:    'https://chatgpt.com/',
  claude:     'https://claude.ai/login',
  gemini:     'https://gemini.google.com/',
  perplexity: 'https://www.perplexity.ai/',
  grok:       'https://x.com/i/grok'
}

// ── Routes ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  const ais = ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok']
  const sessions = {}
  ais.forEach(ai => { sessions[ai] = fs.existsSync(path.join(SESSIONS_DIR, `${ai}.json`)) })
  res.json({ ok: true, sessions })
})

app.get('/check-login/:ai', (req, res) => {
  const sessionPath = path.join(SESSIONS_DIR, `${req.params.ai}.json`)
  res.json({ loggedIn: fs.existsSync(sessionPath) })
})

// ── Main connect flow ─────────────────────────────────────────────
app.post('/open-login/:ai', async (req, res) => {
  const { ai } = req.params
  const loginUrl = LOGIN_URLS[ai]
  if (!loginUrl) return res.json({ error: `Unknown AI: ${ai}` })

  console.log(`\n[${ai}] ═══════════════════════════════`)
  console.log(`[${ai}] Opening persistent Edge profile for login`)
  console.log(`[${ai}] ═══════════════════════════════`)

  // Use a persistent browser profile per AI — this is what avoids "unsafe browser"
  // detection on Google/Claude because the browser accumulates real history like a user
  const profilePath = path.join(SESSIONS_DIR, 'profiles', ai)
  fs.mkdirSync(profilePath, { recursive: true })

  let context
  try {
    context = await chromium.launchPersistentContext(profilePath, {
      channel: 'msedge',
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--no-first-run',
        '--start-maximized',
        '--lang=en-US'
      ],
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
    })
  } catch (e) {
    // If profile is locked (another instance), try with a temp profile
    console.log(`[${ai}] Profile locked, creating fresh context...`)
    context = await chromium.launchPersistentContext(profilePath + '_tmp', {
      channel: 'msedge', headless: false,
      ignoreDefaultArgs: ['--enable-automation', '--enable-blink-features=AutomationControlled']
    })
  }

  const page = await context.newPage()

  try {

    // Inject stealth script before navigation
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
      window.chrome = { runtime: {} }
    })

    // Step 1 — Navigate to the login page
    console.log(`[${ai}] Navigating to login page...`)
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(3000)

    // For ChatGPT: click the "Log in" button on the homepage first
    if (ai === 'chatgpt') {
      const loginBtn = await trySelectorList(page, [
        'button:has-text("Log in")',
        'a:has-text("Log in")',
        '[data-testid="login-button"]',
        'a[href*="login"]'
      ], 8000)
      if (loginBtn) {
        console.log('[chatgpt] Clicking "Log in" button on homepage...')
        await loginBtn.click()
        await page.waitForTimeout(3000)
      }
    }

    // Step 2 — Try to auto-click the "Continue with Google" button
    const googleSelectors = GOOGLE_BTN_SELECTORS[ai] || []
    if (googleSelectors.length > 0) {
      console.log(`[${ai}] Looking for Google sign-in button...`)
      let clicked = false

      for (const sel of googleSelectors) {
        try {
          const el = page.locator(sel).first()
          if (await el.count() > 0 && await el.isVisible()) {
            console.log(`[${ai}] Found Google button: ${sel}`)
            await el.click()
            clicked = true
            console.log(`[${ai}] ✓ Clicked "Continue with Google"`)
            break
          }
        } catch {}
      }

      if (!clicked) {
        console.log(`[${ai}] ⚠ Google button not found automatically — user must click it manually`)
      }
    }

    // Step 3 — Wait for user to complete Google login (up to 3 minutes)
    console.log(`[${ai}] Waiting for you to complete Google login...`)
    const loggedInSelectors = LOGGED_IN_SELECTORS[ai] || []
    let loggedIn = false

    for (const sel of loggedInSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: TIMEOUT })
        loggedIn = true
        console.log(`[${ai}] ✓ Logged in detected via: ${sel}`)
        break
      } catch {}
    }

    if (!loggedIn) {
      console.log(`[${ai}] ⚠ Login was NOT confirmed. Session NOT saved.`)
      try { await context.close() } catch {}
      return res.json({ success: false, loggedIn: false })
    }

    // Step 4 — Save session cookies to disk ONLY if login was confirmed
    await page.waitForTimeout(2000)
    await saveContext(context, ai)
    console.log(`[${ai}] ✓ Session saved successfully`)

    try { await context.close() } catch {}
    res.json({ success: true, loggedIn: true })
  } catch (err) {
    console.error(`[${ai}] Login flow error:`, err.message)
    try { await context.close() } catch {}
    res.json({ error: err.message, loggedIn: false })
  }
})

app.post('/disconnect/:ai', (req, res) => {
  const { ai } = req.params
  const sessionPath = path.join(SESSIONS_DIR, `${ai}.json`)
  if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath)
  // Also clean up persistent profile
  const profilePath = path.join(SESSIONS_DIR, 'profiles', ai)
  if (fs.existsSync(profilePath)) fs.rmSync(profilePath, { recursive: true, force: true })
  console.log(`[${ai}] ✓ Disconnected — session + profile deleted`)
  res.json({ success: true })
})

// ── AI Runners ────────────────────────────────────────────────────
async function runChatGPT(prompt, onProgress) {
  console.log('[ChatGPT] Starting (hidden)...')
  const context = await getOrCreateContext('chatgpt', true)  // headless
  const page = await context.newPage()

  try {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    if (page.url().includes('/auth') || page.url().includes('/login')) throw new Error('NOT_LOGGED_IN')

    console.log('[ChatGPT] Finding input...')
    const input = await trySelectorList(page, [
      '#prompt-textarea',
      'div[contenteditable="true"][data-lexical-editor]',
      'p[data-placeholder]',
      'textarea[placeholder*="Message"]'
    ], 12000)
    if (!input) throw new Error('Input not found')

    await input.click()
    await page.waitForTimeout(500)
    await page.keyboard.type(prompt, { delay: 2 })
    await page.waitForTimeout(400)

    const sendBtn = await trySelectorList(page, [
      '[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label*="Send"]'
    ], 3000)

    if (sendBtn) {
      await sendBtn.click()
    } else {
      await page.keyboard.press('Enter')
    }

    await page.waitForSelector('[data-testid="stop-button"]', { timeout: 20000 }).catch(() => {})
    console.log('[ChatGPT] Response streaming...')

    let lastText = ''
    while (true) {
      const stopBtn = await page.$('[data-testid="stop-button"]').catch(() => null)
      
      const msgs = await page.locator('[data-message-author-role="assistant"]').all().catch(() => [])
      if (msgs.length > 0) {
        const currentText = await msgs[msgs.length - 1].innerText().catch(() => '')
        if (currentText && currentText !== lastText) {
          lastText = currentText
          if (onProgress) onProgress(currentText)
        }
      }

      if (!stopBtn) {
        // Double check just to be sure
        await page.waitForTimeout(1000)
        const stopBtnStill = await page.$('[data-testid="stop-button"]').catch(() => null)
        if (!stopBtnStill) break
      }
      await page.waitForTimeout(400)
    }

    const output = lastText

    await saveContext(context, 'chatgpt')
    console.log(`[ChatGPT] Done. ${output.length} chars`)
    await page.close()
    return output || 'No response captured'
  } catch (err) {
    console.error('[ChatGPT] Error:', err.message)
    try { await page.close() } catch {}
    throw err
  }
}

async function runClaude(prompt, onProgress) {
  console.log('[Claude] Starting (hidden)...')
  const context = await getOrCreateContext('claude', true)  // headless
  const page = await context.newPage()

  try {
    await page.goto('https://claude.ai/new', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    const url = page.url()
    if (url.includes('/login') || url.includes('/welcome') || url.includes('accounts.google')) throw new Error('NOT_LOGGED_IN')

    console.log('[Claude] Finding input...')
    const input = await trySelectorList(page, [
      'div[contenteditable="true"].ProseMirror',
      'div[contenteditable="true"][data-placeholder]',
      'fieldset div[contenteditable="true"]',
      'div[contenteditable="true"]'
    ], 12000)
    if (!input) throw new Error('Input not found')

    await input.click()
    await page.waitForTimeout(500)
    await input.pressSequentially(prompt, { delay: 3 })
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)

    console.log('[Claude] Waiting for response...')
    let lastText = ''
    while (true) {
      const isStreaming = await page.evaluate(() => {
        return document.querySelectorAll('[data-is-streaming="true"]').length > 0
      }).catch(() => false)

      const selectors = ['[data-testid="assistant-message"] .prose', '.font-claude-message', '[data-testid="assistant-message"]']
      let currentText = ''
      for (const sel of selectors) {
        const msgs = await page.locator(sel).all().catch(() => [])
        if (msgs.length > 0) {
          currentText = await msgs[msgs.length - 1].innerText().catch(() => '')
          if (currentText) break
        }
      }

      if (currentText && currentText !== lastText) {
        lastText = currentText
        if (onProgress) onProgress(currentText)
      }

      if (!isStreaming) {
        await page.waitForTimeout(1000)
        const stillStreaming = await page.evaluate(() => document.querySelectorAll('[data-is-streaming="true"]').length > 0).catch(() => false)
        if (!stillStreaming) break
      }
      await page.waitForTimeout(400)
    }

    const output = lastText

    await saveContext(context, 'claude')
    console.log(`[Claude] Done. ${output.length} chars`)
    await page.close()
    return output || 'No response captured'
  } catch (err) {
    console.error('[Claude] Error:', err.message)
    try { await page.close() } catch {}
    throw err
  }
}

async function runGemini(prompt, onProgress) {
  console.log('[Gemini] Starting (hidden)...')
  const context = await getOrCreateContext('gemini', true)  // headless
  const page = await context.newPage()

  try {
    await page.goto('https://gemini.google.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(4000)

    if (page.url().includes('accounts.google.com')) throw new Error('NOT_LOGGED_IN')

    console.log('[Gemini] Finding input...')
    const input = await trySelectorList(page, [
      'div.ql-editor[contenteditable="true"]',
      'rich-textarea .ql-editor',
      'p[data-placeholder][contenteditable="true"]',
      'textarea[aria-label*="prompt"]',
      '[aria-label*="message"] div[contenteditable]'
    ], 12000)
    if (!input) throw new Error('Input not found')

    await input.click()
    await page.waitForTimeout(500)
    await page.keyboard.type(prompt, { delay: 2 })
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')

    await page.waitForSelector('model-response, .response-container', { timeout: 30000 }).catch(() => {})
    console.log('[Gemini] Response started...')

    let lastText = ''
    while (true) {
      const isGenerating = await page.evaluate(() => {
        return document.querySelector('[aria-label="Stop generating"]') ||
               document.querySelector('button[aria-label*="Stop"]')
      }).catch(() => false)

      const selectors = ['model-response .markdown', 'model-response .response-content', 'model-response', '.response-container .markdown']
      let currentText = ''
      for (const sel of selectors) {
        const msgs = await page.locator(sel).all().catch(() => [])
        if (msgs.length > 0) {
          currentText = await msgs[msgs.length - 1].innerText().catch(() => '')
          if (currentText) break
        }
      }

      if (currentText && currentText !== lastText) {
        lastText = currentText
        if (onProgress) onProgress(currentText)
      }

      if (!isGenerating) {
        await page.waitForTimeout(1000)
        break
      }
      await page.waitForTimeout(400)
    }

    const output = lastText

    await saveContext(context, 'gemini')
    console.log(`[Gemini] Done. ${output.length} chars`)
    await page.close()
    return output || 'No response captured'
  } catch (err) {
    console.error('[Gemini] Error:', err.message)
    try { await page.close() } catch {}
    throw err
  }
}

async function runPerplexity(prompt, onProgress) {
  console.log('[Perplexity] Starting (hidden)...')
  const context = await getOrCreateContext('perplexity', true)  // headless
  const page = await context.newPage()

  try {
    await page.goto('https://www.perplexity.ai/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)

    console.log('[Perplexity] Finding input...')
    const input = await trySelectorList(page, [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Search"]',
      '.grow.py-2.outline-none',
      'textarea.overflow-auto',
      '[contenteditable="true"]'
    ], 12000)
    if (!input) throw new Error('Input not found')

    await input.click()
    await page.waitForTimeout(500)
    await page.keyboard.type(prompt, { delay: 2 })
    await page.waitForTimeout(400)
    await page.keyboard.press('Enter')

    await page.waitForTimeout(2000)
    console.log('[Perplexity] Response streaming...')

    let lastText = ''
    while (true) {
      const isLoading = await page.evaluate(() => {
        return document.querySelectorAll('[class*="loading"], [class*="spinner"], [aria-label*="loading"]').length > 0
      }).catch(() => false)

      const selectors = ['.prose', '[class*="answer"]', '[class*="markdown"]', '[data-testid="answer"]']
      let currentText = ''
      for (const sel of selectors) {
        const msgs = await page.locator(sel).all().catch(() => [])
        if (msgs.length > 0) {
          currentText = await msgs[msgs.length - 1].innerText().catch(() => '')
          if (currentText) break
        }
      }

      if (currentText && currentText !== lastText) {
        lastText = currentText
        if (onProgress) onProgress(currentText)
      }

      if (!isLoading) {
        await page.waitForTimeout(1000)
        break
      }
      await page.waitForTimeout(400)
    }

    const output = lastText

    await saveContext(context, 'perplexity')
    console.log(`[Perplexity] Done. ${output.length} chars`)
    await page.close()
    return output || 'No response captured'
  } catch (err) {
    console.error('[Perplexity] Error:', err.message)
    try { await page.close() } catch {}
    throw err
  }
}

async function runGrok(prompt, onProgress) {
  console.log('[Grok] Starting (hidden)...')
  const context = await getOrCreateContext('grok', true)
  const page = await context.newPage()

  try {
    // Try grok.com first (standalone app, cleaner DOM), fall back to x.com/i/grok
    await page.goto('https://grok.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(4000)

    const url = page.url()
    if (url.includes('sign-in') || url.includes('login') || url.includes('auth')) {
      // Try x.com/i/grok as fallback
      await page.goto('https://x.com/i/grok', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)
      if (page.url().includes('/login') || page.url().includes('/flow')) throw new Error('NOT_LOGGED_IN')
    }

    console.log('[Grok] Page loaded:', page.url())

    // Find input field — try many selectors
    console.log('[Grok] Finding input...')
    const input = await trySelectorList(page, [
      'textarea[placeholder*="Ask"]',
      'textarea[placeholder*="Grok"]',
      'textarea[placeholder*="ask"]',
      'textarea',
      'div[contenteditable="true"][data-testid]',
      'div[contenteditable="true"]',
      '[role="textbox"]',
    ], 15000)
    if (!input) throw new Error('Grok input field not found on page')

    await input.click()
    await page.waitForTimeout(800)
    await page.keyboard.type(prompt, { delay: 20 })
    await page.waitForTimeout(600)

    // Find and click send button, or press Enter
    const sendBtn = await trySelectorList(page, [
      'button[aria-label*="Send"]',
      'button[aria-label*="send"]',
      'button[type="submit"]',
      '[data-testid*="send"]',
    ], 2000)
    if (sendBtn) {
      await sendBtn.click()
    } else {
      await page.keyboard.press('Enter')
    }

    console.log('[Grok] Prompt sent. Waiting for response...')
    await page.waitForTimeout(2000)

    // Poll until response text stabilises (stops changing for 3 consecutive checks)
    let lastText = ''
    let stableCount = 0
    const maxChecks = 40

    for (let i = 0; i < maxChecks; i++) {
      await page.waitForTimeout(2000)

      const currentText = await page.evaluate(() => {
        // Priority selectors for Grok response content
        const candidates = [
          // grok.com selectors
          '.message-bubble',
          '[class*="MessageBubble"]',
          '[class*="message-content"]',
          '[class*="responseText"]',
          '[class*="assistantMessage"]',
          '[class*="BotMessage"]',
          '.prose',
          '[class*="markdown"]',
          // x.com/grok selectors
          '[data-testid="bot-response-text"]',
          '[data-testid*="grok"]',
          'article [data-testid="tweetText"]',
        ]
        for (const sel of candidates) {
          const els = document.querySelectorAll(sel)
          if (els.length > 0) {
            const texts = Array.from(els).map(el => el.innerText?.trim()).filter(t => t && t.length > 10)
            if (texts.length > 0) return texts[texts.length - 1]
          }
        }
        return ''
      }).catch(() => '')

      if (currentText && currentText.length > 5) {
        if (currentText !== lastText) {
          lastText = currentText
          stableCount = 0
          if (onProgress) onProgress(currentText)
        } else {
          stableCount++
          if (stableCount >= 2) {
            console.log('[Grok] Response stable. Done.')
            break
          }
        }
      }
    }

    const output = lastText

    await saveContext(context, 'grok')
    console.log(`[Grok] Done. ${output.length} chars`)
    await page.close()
    return output || 'Grok responded but text could not be captured. Try again.'
  } catch (err) {
    console.error('[Grok] Error:', err.message)
    try { await page.close() } catch {}
    throw err
  }
}


// ── Prompt endpoint ───────────────────────────────────────────────
app.post('/prompt/:ai', async (req, res) => {
  const { ai } = req.params
  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'No prompt' })

  const runners = {
    chatgpt: runChatGPT,
    claude: runClaude,
    gemini: runGemini,
    perplexity: runPerplexity,
    grok: runGrok
  }
  const runner = runners[ai]
  if (!runner) return res.status(400).json({ error: `Unknown AI: ${ai}` })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const output = await runner(prompt, (partialText) => {
      res.write(`data: ${JSON.stringify({ output: partialText, status: 'running' })}\n\n`)
    })
    res.write(`data: ${JSON.stringify({ output, status: 'done' })}\n\n`)
    res.end()
  } catch (err) {
    const msg = err.message || String(err)
    if (msg === 'NOT_LOGGED_IN') {
      res.write(`data: ${JSON.stringify({
        error: 'not_logged_in',
        output: `⚠️ ${ai} is not logged in. Go to Connections and connect it first.`,
        status: 'error'
      })}\n\n`)
    } else {
      res.write(`data: ${JSON.stringify({ error: msg, output: `❌ ${ai} failed: ${msg}`, status: 'error' })}\n\n`)
    }
    res.end()
  }
})

// ── Shutdown ──────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n[Server] Shutting down...')
  if (loginBrowserInstance) await loginBrowserInstance.close().catch(() => {})
  if (promptBrowserInstance) await promptBrowserInstance.close().catch(() => {})
  process.exit(0)
})

app.listen(3001, () => {
  console.log('===========================================')
  console.log('  Orchestria Automation Server v2.0')
  console.log('  Running on http://localhost:3001')
  console.log('  Phase 1: Google OAuth connect flow ready')
  console.log('===========================================')
})
