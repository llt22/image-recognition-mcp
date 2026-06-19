# image-recognition-mcp

[English](README.md) | [中文](README.zh-CN.md)

An [MCP](https://modelcontextprotocol.io) server that gives **vision-less LLMs** the ability to recognize clipboard screenshots and images, by proxying to a configured OpenAI-compatible vision model.

If your coding agent (like ZCode running on a text-only model) can't see images, register this server once and it gains clipboard-first image analysis tools that return a textual description / OCR / answer about screenshots and images.

```
LLM (no vision) ──MCP/stdio──► image-recognition-mcp ──OpenAI-compatible API──► vision model ──► text result
```

## Features

- 🖼️ Four tools:
  - `analyze_clipboard_image` for general screenshot/image analysis
  - `extract_clipboard_text` for OCR-heavy screenshots
  - `diagnose_clipboard_error` for errors, stack traces, terminal output, and failed UI states
  - `recognize_image` for clipboard, file, URL, data URL, or base64 image input
- 📥 Four input forms:
  - Current clipboard image / latest screenshot (default)
  - Local file path (`/Users/x/a.png`, `./pic.jpg`, `~/Desktopshot.png`)
  - HTTP/HTTPS URL (passed straight to OpenAI)
  - Base64 string or `data:image/...;base64,...` data URL
- 🔧 Configurable OpenAI-compatible provider, model (`gpt-4o-mini` by default), detail level, max tokens, timeout
- 🛡️ Validates local / base64 / clipboard images before sending them upstream
- 🔒 Optional local file path switch and allowlist for tighter deployments
- 🧱 stdio transport — works with any MCP-compatible host (ZCode, Claude Desktop, etc.)

## Prerequisites

- Node.js ≥ 20
- An OpenAI API key with access to `gpt-4o` / `gpt-4o-mini`
- Clipboard capture:
  - macOS: [`pngpaste`](https://github.com/jcsalterego/pngpaste) (`brew install pngpaste`)
  - Windows: Windows PowerShell (`powershell.exe`, built in)
  - Linux: `wl-paste` from `wl-clipboard` on Wayland, or `xclip` on X11

## Install

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

## Configure

Copy `.env.example` to `.env` and fill in your key. The server loads the project-root `.env` file when present, while keeping any environment variables already provided by the MCP host.

```bash
cp .env.example .env
```

| Env var                    | Default        | Description                                                |
| -------------------------- | -------------- | ---------------------------------------------------------- |
| `OPENAI_API_KEY`           | — (required)   | OpenAI-compatible API key                                  |
| `OPENAI_MODEL`             | `gpt-4o-mini`  | Vision model                                               |
| `OPENAI_BASE_URL`          | OpenAI default | Override for proxies / compatible gateways                 |
| `OPENAI_TIMEOUT_MS`        | `60000`        | Request timeout                                            |
| `LOCAL_FILE_INPUT_ENABLED` | `true`         | Set to `false` to disable local file path input            |
| `LOCAL_FILE_ALLOWED_ROOTS` | —              | Comma-separated local path allowlist, e.g. `/tmp,~/Pictures`; empty allows all |

Provider examples:

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Gemini OpenAI-compatible endpoint
OPENAI_API_KEY=...
OPENAI_MODEL=gemini-2.5-flash
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# Qwen / DashScope OpenAI-compatible endpoint
OPENAI_API_KEY=...
OPENAI_MODEL=qwen-vl-plus
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# LiteLLM or a self-hosted OpenAI-compatible gateway
OPENAI_API_KEY=...
OPENAI_MODEL=your-vision-model
OPENAI_BASE_URL=http://localhost:4000/v1
```

## Run locally

```bash
npm run dev      # tsx, no build step
# or
npm run build && npm start
```

The server speaks MCP over stdio — it expects JSON-RPC frames on stdin and writes them to stdout.

## Register with ZCode

Add an entry to your ZCode MCP config. The config file lives at `~/.zcode/v2/config.json` (look for the `mcpServers` key). The absolute path to `dist/index.js` must be used.

```jsonc
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "node",
      "args": ["/Volumes/wd-512/WebstormProjects/image-recognition-mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxx",
        "OPENAI_MODEL": "gpt-4o-mini"
      }
    }
  }
}
```

Restart ZCode, then copy a screenshot to your clipboard and ask it something like:

> "Analyze the screenshot in my clipboard — what text is shown?"

The agent should call `analyze_clipboard_image` or `recognize_image` with its default clipboard input, then reason over the returned text.

## Register with Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```jsonc
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "node",
      "args": ["/abs/path/to/image-recognition-mcp/dist/index.js"],
      "env": { "OPENAI_API_KEY": "sk-..." }
    }
  }
}
```

## Tool reference

### `analyze_clipboard_image`

| Parameter    | Type                          | Required | Default                                                                  | Description                                            |
| ------------ | ----------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `prompt`     | string                        | no       | `Describe this image in detail, including any visible text (OCR).`       | Question or instruction about the image                |
| `detail`     | `"auto"` \| `"low"` \| `"high"` | no       | `auto`                                                                   | Vision detail level. `low` is cheaper/faster.          |
| `maxTokens`  | integer                       | no       | `1024`                                                                   | Max tokens for the response                            |

Reads the current clipboard image / latest screenshot.

### `extract_clipboard_text`

| Parameter    | Type                          | Required | Default                                                                  | Description                                            |
| ------------ | ----------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `prompt`     | string                        | no       | `Extract all visible text from this image. Preserve line breaks and code formatting when possible.` | Question or instruction about the image                |
| `detail`     | `"auto"` \| `"low"` \| `"high"` | no       | `auto`                                                                   | Vision detail level. `low` is cheaper/faster.          |
| `maxTokens`  | integer                       | no       | `1024`                                                                   | Max tokens for the response                            |

Reads the current clipboard image / latest screenshot and optimizes the default prompt for OCR.

### `diagnose_clipboard_error`

| Parameter    | Type                          | Required | Default                                                                  | Description                                            |
| ------------ | ----------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `prompt`     | string                        | no       | `Analyze this screenshot for error messages, stack traces, terminal output, or UI failure states. Explain the likely cause and actionable next steps.` | Question or instruction about the image |
| `detail`     | `"auto"` \| `"low"` \| `"high"` | no       | `auto`                                                                   | Vision detail level. `low` is cheaper/faster.          |
| `maxTokens`  | integer                       | no       | `1024`                                                                   | Max tokens for the response                            |

Reads the current clipboard image / latest screenshot and optimizes the default prompt for debugging.

### `recognize_image`

| Parameter    | Type                          | Required | Default                                                                  | Description                                            |
| ------------ | ----------------------------- | -------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `image`      | string                        | no       | `"clipboard"`                                                            | Path / URL / data URL / base64 / `"clipboard"`         |
| `prompt`     | string                        | no       | `Describe this image in detail, including any visible text (OCR).`       | Question or instruction about the image                |
| `detail`     | `"auto"` \| `"low"` \| `"high"` | no       | `auto`                                                                   | Vision detail level. `low` is cheaper/faster.          |
| `maxTokens`  | integer                       | no       | `1024`                                                                   | Max tokens for the response                            |

Returns `{ content: [{ type: "text", text: "..." }] }`, or `isError: true` with an error message on failure.

Local file, data URL, raw base64, and clipboard inputs must be PNG, JPEG, GIF, WebP, or BMP images up to 20 MiB. HTTP/HTTPS URLs are passed to OpenAI as URLs.

## Project structure

```
image-recognition-mcp/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # MCP server entry, registers tools, stdio transport
    ├── config.ts             # Loads + validates env config
    ├── tools/
    │   └── recognize.ts      # vision tool definitions + handlers
    ├── providers/
    │   └── openai.ts         # GPT-4o vision call
    └── inputs/
        ├── index.ts          # resolveImage() dispatcher
        ├── types.ts
        ├── image.ts          # image MIME / size / magic-byte validation
        ├── file.ts           # local path → base64
        ├── url.ts            # HTTP(S) URL passthrough
        ├── base64.ts         # base64 / data URL
        └── clipboard.ts      # clipboard image capture for macOS / Windows / Linux
```

## License

MIT
