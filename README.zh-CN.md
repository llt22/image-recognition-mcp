# image-recognition-mcp

[English](README.md) | [中文](README.zh-CN.md)

一个 [MCP](https://modelcontextprotocol.io) 服务器，用来让**没有视觉能力的 LLM** 也能识别剪贴板截图和图片。它会把图片转交给你配置的 OpenAI-compatible 视觉模型，再把文字描述、OCR 或问题答案返回给调用方。

如果你的编码 Agent 使用的是纯文本模型，看不到截图，把这个服务注册一次之后，它就能优先从剪贴板读取截图，并通过 MCP 工具完成图片分析。

```text
LLM（无视觉）──MCP/stdio──► image-recognition-mcp ──OpenAI-compatible API──► 视觉模型 ──► 文本结果
```

## 功能

- 四个工具：
  - `analyze_clipboard_image`：通用剪贴板截图/图片分析
  - `extract_clipboard_text`：偏 OCR 的截图文字提取
  - `diagnose_clipboard_error`：分析报错截图、堆栈、终端输出、失败 UI 状态
  - `recognize_image`：支持剪贴板、文件、URL、data URL 或 base64 图片输入
- 四种输入方式：
  - 当前剪贴板图片 / 最新截图，默认方式
  - 本地文件路径，例如 `/Users/x/a.png`、`./pic.jpg`、`~/Desktop/shot.png`
  - HTTP/HTTPS URL，直接传给 OpenAI-compatible API
  - Base64 字符串或 `data:image/...;base64,...` data URL
- 可配置 OpenAI-compatible provider、模型、detail、max tokens 和超时
- 发送上游前会校验本地图片、base64 图片和剪贴板图片
- 可选关闭本地文件路径输入，或通过 allowlist 限制可读取目录
- 使用 stdio transport，兼容 ZCode、Claude Desktop 等 MCP host

## 前置要求

- Node.js >= 20
- 一个可访问视觉模型的 OpenAI-compatible API key
- 剪贴板图片读取依赖：
  - macOS：[`pngpaste`](https://github.com/jcsalterego/pngpaste)，安装命令 `brew install pngpaste`
  - Windows：Windows PowerShell，系统内置 `powershell.exe`
  - Linux：Wayland 使用 `wl-clipboard` 的 `wl-paste`，X11 使用 `xclip`

## 安装

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

## 配置

复制 `.env.example` 为 `.env`，然后填入你的 key。服务启动时会读取项目根目录的 `.env`，同时保留 MCP host 已经传入的环境变量。

```bash
cp .env.example .env
```

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 必填 | OpenAI-compatible API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | 视觉模型名 |
| `OPENAI_BASE_URL` | OpenAI 默认地址 | 代理或兼容网关地址 |
| `OPENAI_TIMEOUT_MS` | `60000` | 请求超时时间，单位毫秒 |
| `LOCAL_FILE_INPUT_ENABLED` | `true` | 设为 `false` 可禁用本地文件路径输入 |
| `LOCAL_FILE_ALLOWED_ROOTS` | 空 | 本地路径 allowlist，逗号分隔，例如 `/tmp,~/Pictures`；空表示允许全部 |

Provider 示例：

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

# LiteLLM 或自托管 OpenAI-compatible 网关
OPENAI_API_KEY=...
OPENAI_MODEL=your-vision-model
OPENAI_BASE_URL=http://localhost:4000/v1
```

## 本地运行

```bash
npm run dev      # 使用 tsx，无需先构建
# 或
npm run build && npm start
```

服务通过 stdio 运行 MCP，它会从 stdin 读取 JSON-RPC 消息，并向 stdout 写回响应。

## 注册到 ZCode

在 ZCode MCP 配置里添加一项。配置文件通常在 `~/.zcode/v2/config.json`，找到 `mcpServers` 字段并加入下面配置。`dist/index.js` 必须使用绝对路径。

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

重启 ZCode，把截图复制到剪贴板，然后可以这样问：

> 分析我剪贴板里的截图，上面有什么文字？

Agent 应该会调用 `analyze_clipboard_image`，或者使用默认剪贴板输入的 `recognize_image`，然后基于返回文本继续推理。

## 注册到 Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

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

## 工具说明

### `analyze_clipboard_image`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Describe this image in detail, including any visible text (OCR).` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更便宜 |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板图片 / 最新截图。

### `extract_clipboard_text`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Extract all visible text from this image. Preserve line breaks and code formatting when possible.` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更便宜 |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板图片 / 最新截图，默认 prompt 更适合 OCR。

### `diagnose_clipboard_error`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prompt` | string | 否 | `Analyze this screenshot for error messages, stack traces, terminal output, or UI failure states. Explain the likely cause and actionable next steps.` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更便宜 |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

读取当前剪贴板图片 / 最新截图，默认 prompt 更适合调试报错。

### `recognize_image`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `image` | string | 否 | `"clipboard"` | 路径 / URL / data URL / base64 / `"clipboard"` |
| `prompt` | string | 否 | `Describe this image in detail, including any visible text (OCR).` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更便宜 |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

返回 `{ content: [{ type: "text", text: "..." }] }`，失败时返回 `isError: true` 和错误信息。

本地文件、data URL、原始 base64 和剪贴板输入必须是 PNG、JPEG、GIF、WebP 或 BMP，大小不超过 20 MiB。HTTP/HTTPS URL 会作为 URL 直接传给 OpenAI-compatible API。

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
