# Social Tool

## Setup

### Yêu cầu hệ thống

- Node.js (version 18 trở lên)
- Yarn package manager

### Cài đặt dependencies

```bash
# Cài đặt tất cả dependencies
yarn install
```

## Build và chạy

### Build dự án

```bash
# Build dự án cho production
yarn build
```

### Chạy commands

```bash
# Chạy command trong development
yarn command:dev <command-name> <path-to-settings>

# Chạy command đã build
yarn command <command-name> <path-to-settings>
```

## Danh sách Commands

### 1. generate-image-chat-gpt

**Mô tả:** Tạo ảnh sử dụng ChatGPT

**Cách sử dụng:**

```bash
# Development mode
yarn command:dev generate-image-chat-gpt src/commands/generate-image-chat-gpt/setting.json

# Production mode (sau khi build)
yarn command generate-image-chat-gpt src/commands/generate-image-chat-gpt/setting.json
```

**File cấu hình:** `src/commands/generate-image-chat-gpt/setting.json`

```json
{
  "show_browser": true,
  "delay_between_jobs": 1000,
  "jobs": [
    {
      "prompt": "Tạo cho tôi một bức ảnh của một con chim cánh cụt đang ngậm một cái bánh mì",
      "outputPath": "image.png"
    },
    {
      "prompt": "Tạo cho tôi một bức ảnh của một con chim đại bàng đang bay",
      "outputPath": "image2.png"
    }
  ]
}
```

**Tham số:**

- `file-settings`: Đường dẫn đến file JSON chứa cấu hình
  - `show_browser`: Hiển thị browser khi chạy (true/false)
  - `delay_between_jobs`: Thời gian chờ giữa các job (milliseconds)
  - `jobs`: Mảng các job cần thực hiện
    - `prompt`: Mô tả ảnh muốn tạo
    - `outputPath`: Đường dẫn lưu file ảnh

### 2. generate-audio-aistudio

**Mô tả:** Tạo audio sử dụng AI Studio

**Cách sử dụng:**

```bash
# Development mode
yarn command:dev generate-audio-aistudio src/commands/generate-audio-aistudio/setting.json

# Production mode (sau khi build)
yarn command generate-audio-aistudio src/commands/generate-audio-aistudio/setting.json
```

**File cấu hình:** `src/commands/generate-audio-aistudio/setting.json`

```json
{
  "show_browser": true,
  "delay_between_jobs": 10000,
  "jobs": [
    {
      "style_instruction": "Read aloud in a warm and friendly tone",
      "prompt": "Xin chào, tôi là John Doe, tôi hiện đang ở Hà Nội, tôi đang làm việc tại Google",
      "voice": "Zephyr",
      "outputPath": "audio.wav"
    },
    {
      "style_instruction": "Đọc với tông giọng con nít, nhẹ nhàng, vui vẻ",
      "prompt": "Xin chào, tôi là John Doe, tôi hiện đang ở Hà Nội, tôi đang làm việc tại Google",
      "voice": "Puck",
      "outputPath": "audio2.wav"
    }
  ]
}
```

**Tham số:**

- `file-settings`: Đường dẫn đến file JSON chứa cấu hình
  - `show_browser`: Hiển thị browser khi chạy (true/false)
  - `delay_between_jobs`: Thời gian chờ giữa các job (milliseconds)
  - `jobs`: Mảng các job cần thực hiện
    - `style_instruction`: Hướng dẫn phong cách đọc
    - `prompt`: Nội dung text cần chuyển thành audio
    - `voice`: Tên voice sử dụng (có thể xem danh sách trong `list-voice.ts`)
    - `outputPath`: Đường dẫn lưu file audio

**Ví dụ:**

```bash
# Tạo ảnh với cấu hình mặc định
yarn command generate-image-chat-gpt src/commands/generate-image-chat-gpt/setting.json

# Tạo audio với cấu hình mặc định
yarn command generate-audio-aistudio src/commands/generate-audio-aistudio/setting.json

# Sử dụng file cấu hình tùy chỉnh
yarn command generate-image-chat-gpt ./my-image-settings.json
yarn command generate-audio-aistudio ./my-audio-settings.json
```

## Cấu trúc thư mục

```
src/
├── commands/
│   ├── generate-audio-aistudio/
│   │   ├── generate-audio-aistudio.command.ts
│   │   ├── setting.json
│   │   └── list-voice.ts
│   └── generate-image-chat-gpt/
│       ├── generate-image-chat-gpt.command.ts
│       └── setting.json
├── utils/
│   ├── browser.util.ts
│   └── common.util.ts
├── app.module.ts
└── main.ts
```
