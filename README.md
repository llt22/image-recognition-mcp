# clipboard-vision-mcp

[![LINUX DO](https://img.shields.io/badge/LINUX--DO-Community-blue?style=flat)](https://linux.do/)

[中文](README.md) | [English](README.en.md)

给你的编码助手或 AI 工具装上"眼睛"——注册这个 MCP 服务，它就能看懂你剪贴板里的截图。自动把图片发给 OpenAI-compatible 视觉模型，拿回文字描述、OCR 结果或分析。

```text
LLM（无视觉）──MCP/stdio──► clipboard-vision-mcp ──OpenAI-compatible API──► 视觉模型 ──► 文本结果
```

## 快速开始

### 1. 准备运行环境

需要 **Node.js ≥ 20**，以及一个**能访问视觉模型的 OpenAI-compatible API key**（可在下面的 MCP Host 配置中填入）。这里的 `OPENAI_*` 变量名只是沿用 OpenAI-compatible 接口习惯，不代表只能使用 OpenAI 官方模型。

最简单的用法是直接在 MCP Host 配置里用 `npx -y clipboard-vision-mcp`，不需要提前全局安装。想先在本机装好命令，也可以执行：

```bash
npm install -g clipboard-vision-mcp
```

从源码调试时再 clone 仓库运行：

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

### 2. 准备剪贴板工具

系统需要能读取剪贴板中的图片：

- **macOS**：安装 [pngpaste](https://github.com/jcsalterego/pngpaste)（`brew install pngpaste`）
- **Windows**：系统内置 PowerShell，无需额外安装
- **Linux Wayland**：`wl-clipboard` 的 `wl-paste`
- **Linux X11**：`xclip`

### 3. 配置 MCP Host

在你的 MCP Host（ZCode、Claude Desktop 等）配置文件中找到 `mcpServers` 字段，添加以下内容。

下面用 Qwen / DashScope 举例；如果你用 Gemini、LiteLLM、one-api、New API 或其他 OpenAI-compatible 网关，只需要替换 `OPENAI_API_KEY`、`OPENAI_MODEL` 和 `OPENAI_BASE_URL`。

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

如果你确实使用 OpenAI 官方接口，可以删掉 `OPENAI_BASE_URL`，并把模型改成支持视觉的 OpenAI 模型，例如 `gpt-4o-mini`。

配置路径参考：ZCode 在 `~/.zcode/v2/config.json`，Claude Desktop 在 `~/Library/Application Support/Claude/claude_desktop_config.json`。

如果从本地 clone 运行，改用 `"command": "node"`，`args` 指向 `dist/index.js` 的绝对路径。

### 4. 验证

复制一张截图到剪贴板，然后向你的 AI 助手提问：

> 分析我剪贴板里的截图，上面有什么文字？

如果 MCP Host 已正确加载服务，助手通常会调用 `analyze_clipboard_image`，或使用默认剪贴板输入的 `recognize_image`，然后返回图片中的文字内容。

## 功能

- 四个专用工具，适配不同场景：
  - `analyze_clipboard_image`：通用截图分析，适合"这张图里有什么"
  - `extract_clipboard_text`：偏 OCR，提取截图中的文字，保留换行和代码格式
  - `diagnose_clipboard_error`：调试利器，分析报错截图、堆栈、终端输出或异常 UI 状态
  - `recognize_image`：最灵活的工具，支持剪贴板、本地文件、URL、data URL 和 base64 图片
- 四种图片来源：剪贴板（默认）、本地文件路径、HTTP(S) URL、base64 / data URL
- 可配置 OpenAI-compatible provider、模型（默认 `gpt-4o-mini`）、detail 级别、最大 token 数和超时
- 发送前校验本地、base64 和剪贴板图片的格式与大小
- 支持关闭本地文件输入，或用 allowlist 限制可读取的目录
- stdio transport，兼容任意 MCP Host

## 配置项

除在 MCP Host 的 `env` 中直接设置外，也支持项目根目录的 `.env` 文件：

```bash
cp .env.example .env
```

服务启动时会自动加载 `.env`，同时保留 MCP Host 已传入的环境变量。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `OPENAI_API_KEY` | 必填 | OpenAI-compatible API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | 视觉模型名 |
| `OPENAI_BASE_URL` | OpenAI 默认地址 | OpenAI-compatible 网关地址；使用 OpenAI 官方时可不填 |
| `OPENAI_TIMEOUT_MS` | `60000` | 请求超时时间（毫秒） |
| `LOCAL_FILE_INPUT_ENABLED` | `true` | 设为 `false` 可禁用本地文件路径输入 |
| `LOCAL_FILE_ALLOWED_ROOTS` | 空 | 路径 allowlist，逗号分隔，例如 `/tmp,~/Pictures`；空表示允许所有路径 |

Provider 示例：

```bash
# Qwen / DashScope OpenAI-compatible 端点
OPENAI_API_KEY=...
OPENAI_MODEL=qwen-vl-plus
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Gemini OpenAI-compatible 端点
OPENAI_API_KEY=...
OPENAI_MODEL=gemini-2.5-flash
OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

# LiteLLM 或自托管 OpenAI-compatible 网关
OPENAI_API_KEY=...
OPENAI_MODEL=your-vision-model
OPENAI_BASE_URL=http://localhost:4000/v1

# OpenAI 官方接口
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
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

## 本地运行

```bash
npm run dev      # tsx 直接运行，无需构建
# 或
npm run build && npm start
```

服务通过 stdio 收发 MCP 消息——从 stdin 读 JSON-RPC，向 stdout 写回响应。

## 项目结构

```text
clipboard-vision-mcp/
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
