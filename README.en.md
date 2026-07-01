# clipboard-vision-mcp

[![npm](https://img.shields.io/npm/v/clipboard-vision-mcp?color=cb3837&label=npm)](https://www.npmjs.com/package/clipboard-vision-mcp)
[![LINUX DO](https://img.shields.io/badge/LINUX--DO-Community-blue?style=flat)](https://linux.do/)

[中文](README.md) | [English](README.en.md)

A clipboard-first [MCP](https://modelcontextprotocol.io) server that gives vision-less LLMs the ability to understand screenshots and images. It can read the system clipboard, local image files, HTTP(S) image URLs, data URLs, or base64 images, then return text descriptions or answers to image questions through an OpenAI-compatible vision model.

```text
LLM (no vision) ──MCP/stdio──► clipboard-vision-mcp ──OpenAI-compatible API──► vision model ──► text result
```

## Usage

### 1. Prepare Dependencies

You need:

- Node.js 20 or newer
- An OpenAI-compatible API key with access to a vision model
- A clipboard image reader:
  - macOS: `brew install pngpaste`
  - Windows: PowerShell is built in
  - Linux Wayland: `wl-paste` from `wl-clipboard`
  - Linux X11: `xclip`

You do not need to install the package globally. The recommended setup is to run it from your MCP Host with `npx -y clipboard-vision-mcp`.

Package page: [clipboard-vision-mcp on npm](https://www.npmjs.com/package/clipboard-vision-mcp)

### 2. Configure Your MCP Host

Add this to the `mcpServers` section of your MCP Host config (ZCode, Claude Desktop, etc.):

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

This example uses Qwen / DashScope. If you use OpenAI's official endpoint, remove `OPENAI_BASE_URL` and set `OPENAI_MODEL` to a vision-capable OpenAI model, such as `gpt-4o-mini`.

Common config paths:

- ZCode: `~/.zcode/v2/config.json`
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`

### 3. Verify

Copy a screenshot to your clipboard and ask your AI assistant:

> Analyze the screenshot in my clipboard. What text is shown?

If your MCP Host loaded the server correctly, the assistant should call `recognize_image`, which reads the clipboard by default, and return the captured content.

## Tool

### `recognize_image`

One general-purpose image recognition tool. It reads the clipboard by default, or accepts a local path, HTTP(S) URL, data URL, base64 image, or `"clipboard"` through the `image` parameter.

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `image` | string | no | `"clipboard"` | Path / URL / data URL / base64 / `"clipboard"` |
| `prompt` | string | no | `Describe this image in detail, including any visible text.` | Question or instruction about the image |
| `detail` | `"auto"` \| `"low"` \| `"high"` | no | `auto` | Vision detail level; `low` is faster and cheaper |
| `maxTokens` | integer | no | `1024` | Max tokens for the response |

Example requests:

- Describe this screenshot
- Extract the text from this image
- What error message is shown in this UI screenshot?
- What does this chart show?

Returns `{ content: [{ type: "text", text: "..." }] }`, or `isError: true` with an error message on failure.

## Configuration

Besides setting environment variables in the MCP Host's `env` block, you can also use a project-root `.env` file. Environment variables passed by the MCP Host take precedence.

| Env var | Default | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | — (required) | OpenAI-compatible API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Vision model |
| `OPENAI_BASE_URL` | OpenAI default | OpenAI-compatible gateway URL; omit it for OpenAI's official endpoint |
| `OPENAI_TIMEOUT_MS` | `60000` | Request timeout in milliseconds |
| `LOCAL_FILE_INPUT_ENABLED` | `true` | Set to `false` to disable local file path input |
| `LOCAL_FILE_ALLOWED_ROOTS` | — | Comma-separated allowlist, e.g. `/tmp,~/Pictures`; empty allows all |

Provider examples:

```bash
# Qwen / DashScope
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

Local files, data URLs, raw base64, and clipboard inputs must be PNG, JPEG, GIF, WebP, or BMP images up to 20 MiB. HTTP/HTTPS URLs are passed directly to the OpenAI-compatible API.

## Development

Run from source:

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

Local development:

```bash
npm run dev
# or
npm run build && npm start
```

If running a local clone as an MCP server, use `"command": "node"` and point `args` to the absolute path of `dist/index.js`.

The server speaks MCP over stdio: it reads JSON-RPC frames from stdin and writes responses to stdout.

## Project Structure

```text
clipboard-vision-mcp/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # MCP server entry, registers tools, stdio transport
    ├── config.ts             # Loads and validates env config
    ├── tools/
    │   └── recognize.ts      # Vision tool definitions and handlers
    ├── providers/
    │   └── openai.ts         # OpenAI-compatible vision call
    └── inputs/
        ├── index.ts          # resolveImage() dispatcher
        ├── types.ts
        ├── image.ts          # Image MIME, size, magic-byte validation
        ├── file.ts           # Local path to base64
        ├── url.ts            # HTTP(S) URL passthrough
        ├── base64.ts         # base64 / data URL
        └── clipboard.ts      # Clipboard capture for macOS / Windows / Linux
```

## License

MIT
