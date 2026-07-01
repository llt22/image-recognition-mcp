# clipboard-vision-mcp

[![LINUX DO](https://img.shields.io/badge/LINUX--DO-Community-blue?style=flat)](https://linux.do/)

[中文](README.md) | [English](README.en.md)

A clipboard-first [MCP](https://modelcontextprotocol.io) server that gives **vision-less LLMs** the ability to understand clipboard screenshots. It proxies the image to a configured OpenAI-compatible vision model and returns text descriptions or answers to image questions.

```text
LLM (no vision) ──MCP/stdio──► clipboard-vision-mcp ──OpenAI-compatible API──► vision model ──► text result
```

## Quick start

### 1. Prepare the runtime

You'll need **Node.js ≥ 20** and an **OpenAI-compatible API key** with access to a vision model (set it in the MCP Host config below). The `OPENAI_*` variable names follow the OpenAI-compatible API convention; they do not mean you must use OpenAI's official endpoint.

The simplest setup is to run the package from your MCP Host with `npx -y clipboard-vision-mcp`; no global install is required. If you prefer a local command, install it globally:

```bash
npm install -g clipboard-vision-mcp
```

For source-based development:

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

### 2. Clipboard prerequisites

Your system needs a tool to read clipboard images:

- **macOS**: [pngpaste](https://github.com/jcsalterego/pngpaste) (`brew install pngpaste`)
- **Windows**: PowerShell (built in, no extra install)
- **Linux Wayland**: `wl-paste` from `wl-clipboard`
- **Linux X11**: `xclip`

### 3. Configure your MCP Host

Add the following to the `mcpServers` section of your MCP Host config (ZCode, Claude Desktop, etc.).

This example uses Qwen / DashScope. For Gemini, LiteLLM, one-api, New API, or another OpenAI-compatible gateway, replace `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL`.

```jsonc
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "npx",
      "args": ["-y", "clipboard-vision-mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key",
        "OPENAI_MODEL": "qwen-vl-plus",
        "OPENAI_BASE_URL": "https://dashscope.aliyuncs.com/compatible-mode/v1"
      }
    }
  }
}
```

If you use OpenAI's official endpoint, remove `OPENAI_BASE_URL` and set `OPENAI_MODEL` to a vision-capable OpenAI model, such as `gpt-4o-mini`.

File paths: ZCode config at `~/.zcode/v2/config.json`, Claude Desktop at `~/Library/Application Support/Claude/claude_desktop_config.json`.

If running from a local clone, use `"command": "node"` and point `args` to the absolute path of `dist/index.js`.

### 4. Verify

Copy a screenshot to your clipboard and ask your AI assistant:

> Analyze the screenshot in my clipboard — what text is shown?

If your MCP Host loaded the server correctly, the assistant should call `recognize_image`, which reads the clipboard by default, and return the captured content.

## Features

- One general-purpose tool, `recognize_image`, supporting clipboard, local files, URLs, data URLs, and base64
- Custom prompts for specific questions, such as describing the image, extracting text, or asking about screenshot details
- Four input sources: clipboard (default), local file path, HTTP(S) URL, base64 / data URL
- Configurable OpenAI-compatible provider, model (`gpt-4o-mini` by default), detail level, max tokens, and timeout
- Validates local, base64, and clipboard images before sending upstream
- Optional local file input toggle and path allowlist for tighter deployments
- stdio transport — works with any MCP-compatible host

## Configuration

Besides setting environment variables in the MCP Host's `env` block, you can also use a project-root `.env` file:

```bash
cp .env.example .env
```

The server loads `.env` on startup while keeping any env vars already provided by the MCP host.

| Env var | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | — (required) | OpenAI-compatible API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Vision model |
| `OPENAI_BASE_URL` | OpenAI default | OpenAI-compatible gateway URL; omit it for OpenAI's official endpoint |
| `OPENAI_TIMEOUT_MS` | `60000` | Request timeout (milliseconds) |
| `LOCAL_FILE_INPUT_ENABLED` | `true` | Set to `false` to disable local file path input |
| `LOCAL_FILE_ALLOWED_ROOTS` | — | Comma-separated allowlist, e.g. `/tmp,~/Pictures`; empty allows all |

Provider examples:

```bash
# Qwen / DashScope OpenAI-compatible endpoint
OPENAI_API_KEY=...
OPENAI_MODEL=qwen-vl-plus
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Gemini OpenAI-compatible endpoint
OPENAI_API_KEY=...
OPENAI_MODEL=gemini-2.5-flash
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# LiteLLM or a self-hosted OpenAI-compatible gateway
OPENAI_API_KEY=...
OPENAI_MODEL=your-vision-model
OPENAI_BASE_URL=http://localhost:4000/v1

# OpenAI official endpoint
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Tool reference

### `recognize_image`

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `image` | string | no | `"clipboard"` | Path / URL / data URL / base64 / `"clipboard"` |
| `prompt` | string | no | `Describe this image in detail, including any visible text.` | Question or instruction about the image |
| `detail` | `"auto"` \| `"low"` \| `"high"` | no | `auto` | Vision detail level; `low` is faster and cheaper |
| `maxTokens` | integer | no | `1024` | Max tokens for the response |

Returns `{ content: [{ type: "text", text: "..." }] }`, or `isError: true` with an error message on failure.

Local files, data URLs, raw base64, and clipboard inputs must be PNG, JPEG, GIF, WebP, or BMP images up to 20 MiB. HTTP/HTTPS URLs are passed directly to the OpenAI-compatible API.

## Run locally

```bash
npm run dev      # tsx, no build step
# or
npm run build && npm start
```

The server speaks MCP over stdio — it reads JSON-RPC frames from stdin and writes responses to stdout.

## Project structure

```text
clipboard-vision-mcp/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # MCP server entry, registers tools, stdio transport
    ├── config.ts             # Loads + validates env config
    ├── tools/
    │   └── recognize.ts      # Vision tool definitions and handlers
    ├── providers/
    │   └── openai.ts         # OpenAI-compatible vision call
    └── inputs/
        ├── index.ts          # resolveImage() dispatcher
        ├── types.ts
        ├── image.ts          # Image MIME, size, magic-byte validation
        ├── file.ts           # Local path → base64
        ├── url.ts            # HTTP(S) URL passthrough
        ├── base64.ts         # base64 / data URL
        └── clipboard.ts      # Clipboard capture for macOS / Windows / Linux
```

## License

MIT
