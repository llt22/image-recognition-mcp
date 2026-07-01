# clipboard-vision-mcp

[![npm](https://img.shields.io/npm/v/clipboard-vision-mcp?color=cb3837&label=npm)](https://www.npmjs.com/package/clipboard-vision-mcp)
[![LINUX DO](https://img.shields.io/badge/LINUX--DO-Community-blue?style=flat)](https://linux.do/)

[中文](README.md) | [English](README.en.md)

给你的编码助手或 AI 工具装上"眼睛"。注册这个 MCP 服务后，原本没有视觉能力的 LLM 可以读取剪贴板截图、本地图片、HTTP(S) 图片 URL、data URL 或 base64 图片，并返回文字描述或对图片问题的回答。

```text
LLM（无视觉）──MCP/stdio──► clipboard-vision-mcp ──OpenAI-compatible API──► 视觉模型 ──► 文本结果
```

## 使用

### 1. 准备依赖

需要：

- Node.js 20 或更高版本
- 能访问视觉模型的 OpenAI-compatible API key
- 剪贴板图片读取工具：
  - macOS：`brew install pngpaste`
  - Windows：系统内置 PowerShell，无需额外安装
  - Linux Wayland：`wl-paste`（来自 `wl-clipboard`）
  - Linux X11：`xclip`

不需要提前安装 npm 包；推荐直接在 MCP Host 配置里使用 `npx -y clipboard-vision-mcp`。

包地址：[clipboard-vision-mcp on npm](https://www.npmjs.com/package/clipboard-vision-mcp)

### 2. 配置 MCP Host

在 MCP Host（ZCode、Claude Desktop 等）的 `mcpServers` 中添加：

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

上面用 Qwen / DashScope 举例。使用 OpenAI 官方接口时，可以删掉 `OPENAI_BASE_URL`，并把模型改成支持视觉的 OpenAI 模型，例如 `gpt-4o-mini`。

常见配置路径：

- ZCode：`~/.zcode/v2/config.json`
- Claude Desktop：`~/Library/Application Support/Claude/claude_desktop_config.json`

### 3. 验证

复制一张截图到剪贴板，然后向你的 AI 助手提问：

> 分析我剪贴板里的截图，上面有什么文字？

如果 MCP Host 已正确加载服务，助手会调用默认读取剪贴板的 `recognize_image`，然后返回图片内容。

## 工具

### `recognize_image`

单个通用图片识别工具。默认读取剪贴板，也可以通过 `image` 参数传入本地路径、HTTP(S) URL、data URL、base64 或 `"clipboard"`。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `image` | string | 否 | `"clipboard"` | 路径 / URL / data URL / base64 / `"clipboard"` |
| `prompt` | string | 否 | `Describe this image in detail, including any visible text.` | 对图片的提问或指令 |
| `detail` | `"auto"` \| `"low"` \| `"high"` | 否 | `auto` | 视觉 detail 级别，`low` 更快更省 token |
| `maxTokens` | integer | 否 | `1024` | 响应最大 token 数 |

示例问题：

- 描述这张截图
- 提取图片里的文字
- 这张 UI 截图里有什么错误提示？
- 这个图表表达了什么？

返回 `{ content: [{ type: "text", text: "..." }] }`；失败时返回 `isError: true` 和错误信息。

## 配置项

除在 MCP Host 的 `env` 中直接设置外，也支持项目根目录的 `.env` 文件。MCP Host 传入的环境变量优先级更高。

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
# Qwen / DashScope
OPENAI_API_KEY=...
OPENAI_MODEL=qwen-vl-plus
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# Gemini OpenAI-compatible endpoint
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

本地文件、data URL、原始 base64 和剪贴板输入必须是 PNG、JPEG、GIF、WebP 或 BMP 格式，单张不超过 20 MiB。HTTP/HTTPS URL 会作为 URL 直接传给 OpenAI-compatible API。

## 开发

从源码运行：

```bash
git clone <this-repo> image-recognition-mcp
cd image-recognition-mcp
npm install
npm run build
```

本地调试：

```bash
npm run dev
# 或
npm run build && npm start
```

如果从本地 clone 作为 MCP server 使用，配置里改用 `"command": "node"`，`args` 指向 `dist/index.js` 的绝对路径。

服务通过 stdio 收发 MCP 消息：从 stdin 读 JSON-RPC，向 stdout 写回响应。

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
