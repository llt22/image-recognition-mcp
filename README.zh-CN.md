# image-recognition-mcp

[English](README.md) | [中文](README.zh-CN.md)

如果你的编码助手或 AI 工具用的是纯文本模型，每次截图都得手动描述或者切到带视觉的工具里处理，这个 MCP 服务就是来解决这个问题的。

只需注册一次，它就能让**没有视觉能力的 LLM** 看懂你剪贴板里的截图——自动把图片转给 OpenAI-compatible 视觉模型，拿回文字描述、OCR 结果或相关分析。

```text
LLM（无视觉）──MCP/stdio──► image-recognition-mcp ──OpenAI-compatible API──► 视觉模型 ──► 文本结果
```

## 功能

- 四个专用工具：
  - `analyze_clipboard_image`：通用截图分析，适合"这张图里有什么"这类问题
  - `extract_clipboard_text`：偏 OCR，专门提取截图中的文字，保留换行和代码格式
  - `diagnose_clipboard_error`：调试利器，分析报错截图、堆栈、终端输出或异常的 UI 状态
  - `recognize_image`：最灵活的工具，支持剪贴板、本地文件、URL、data URL 和 base64 图片输入
- 四种图片来源：
  - 当前剪贴板图片（默认，也是最常用的方式）
  - 本地文件路径，例如 `/Users/x/a.png`、`./pic.jpg`、`~/Desktop/shot.png`
  - HTTP/HTTPS URL，直接传给 OpenAI-compatible API
  - Base64 字符串或 `data:image/...;base64,...` data URL
- 可配置 OpenAI-compatible provider、模型（默认 `gpt-4o-mini`）、detail 级别、最大 token 数和超时时间
- 发送前校验本地、base64 和剪贴板图片的格式与大小
- 支持关闭本地文件输入，或用 allowlist 限制可读取的目录
- stdio transport，兼容任意 MCP host（ZCode、Claude Desktop 等）

## 前置要求

- Node.js ≥ 20
- 一个能访问视觉模型的 OpenAI-compatible API key
- 剪贴板图片读取工具：
  - macOS：[`pngpaste`](https://github.com/jcsalterego/pngpaste)（`brew install pngpaste`）
  - Windows：系统内置 PowerShell（`powershell.exe`）
  - Linux：Wayland 用 `wl-clipboard` 的 `wl-paste`，X11 用 `xclip`

## 安装

从 npm 安装：

```bash
npm install -g @llt22/image-recognition-mcp
```

或从源码运行：

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

## 配置

复制 `.env.example` 为 `.env`，填入你的 key。服务启动时会自动读取项目根目录的 `.env`，同时保留 MCP host 已传入的环境变量。

```bash
cp .env.example .env
```

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 必填 | OpenAI-compatible API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | 视觉模型名 |
| `OPENAI_BASE_URL` | OpenAI 默认地址 | 代理或兼容网关地址 |
| `OPENAI_TIMEOUT_MS` | `60000` | 请求超时时间（毫秒） |
| `LOCAL_FILE_INPUT_ENABLED` | `true` | 设为 `false` 可禁用本地文件路径输入 |
| `LOCAL_FILE_ALLOWED_ROOTS` | 空 | 本地路径 allowlist，逗号分隔，例如 `/tmp,~/Pictures`；空表示允许所有路径 |

Provider 示例：

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Gemini OpenAI-compatible 端点
OPENAI_API_KEY=...
OPENAI_MODEL=gemini-2.5-flash
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# Qwen / DashScope OpenAI-compatible 端点
OPENAI_API_KEY=...
OPENAI_MODEL=qwen-vl-plus
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# LiteLLM 或自托管 OpenAI-compatible 网关
OPENAI_API_KEY=...
OPENAI_MODEL=your-vision-model
OPENAI_BASE_URL=http://localhost:4000/v1
```

## 本地运行

```bash
npm run dev      # tsx 直接运行，无需构建
# 或
npm run build && npm start
```

服务通过 stdio 收发 MCP 消息——从 stdin 读 JSON-RPC，向 stdout 写回响应。

## 注册到 ZCode

在 ZCode MCP 配置中添加一项。配置文件路径为 `~/.zcode/v2/config.json`，找到 `mcpServers` 字段并加入以下内容。

```jsonc
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "npx",
      "args": ["-y", "@llt22/image-recognition-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-xxxxxxxxxxxxxxxx",
        "OPENAI_MODEL": "gpt-4o-mini"
      }
    }
  }
}
```

如果你从本地 clone 的源码运行，则改用 `command: "node"`，并把 `args` 指向 `dist/index.js` 的绝对路径。

重启 ZCode，截个图复制到剪贴板，然后可以这样问：

> 分析我剪贴板里的截图，上面有什么文字？

Agent 通常会调用 `analyze_clipboard_image`，或使用默认剪贴板输入的 `recognize_image`，然后用返回的文字内容继续工作。

## 注册到 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```jsonc
{
  "mcpServers": {
    "clipboard-vision": {
      "command": "npx",
      "args": ["-y", "@llt22/image-recognition-mcp"],
      "env": { "OPENAI_API_KEY": "sk-..." }
    }
  }
}
```

## 工具说明

### `analyze_clipboard_image`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Describe this image in detail, including any visible text (OCR).` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更省 token |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板中的图片。

### `extract_clipboard_text`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Extract all visible text from this image. Preserve line breaks and code formatting when possible.` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更省 token |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板中的图片，默认 prompt 针对 OCR 场景优化。

### `diagnose_clipboard_error`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Analyze this screenshot for error messages, stack traces, terminal output, or UI failure states. Explain the likely cause and actionable next steps.` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更省 token |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板中的图片，默认 prompt 针对错误诊断优化。

### `recognize_image`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `image` | string | 否 | `"clipboard"` | 路径 / URL / data URL / base64 / `"clipboard"` |
| `prompt` | string | 否 | `Describe this image in detail, including any visible text (OCR).` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更省 token |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

返回 `{ content: [{ type: "text", text: "..." }] }`，失败时返回 `isError: true` 和错误信息。

本地文件、data URL、原始 base64 和剪贴板输入必须是 PNG、JPEG、GIF、WebP 或 BMP 格式，单张不超过 20 MiB。HTTP/HTTPS URL 会作为 URL 直接传给 OpenAI-compatible API。

## 项目结构

```text
image-recognition-mcp/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── index.ts              # MCP server 入口，注册工具和 stdio transport
    ├── config.ts             # 加载和校验 env 配置
    ├── tools/
    │   └── recognize.ts      # 视觉工具定义和 handler
    ├── providers/
    │   └── openai.ts         # OpenAI-compatible 视觉调用
    └── inputs/
        ├── index.ts          # resolveImage() 分发器
        ├── types.ts
        ├── image.ts          # 图片 MIME、大小、magic-byte 校验
        ├── file.ts           # 本地路径转 base64
        ├── url.ts            # HTTP(S) URL 透传
        ├── base64.ts         # base64 / data URL
        └── clipboard.ts      # macOS / Windows / Linux 剪贴板图片读取
```

## License

MIT
