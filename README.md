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
yarn command:dev <command-name>

# Chạy command đã build
yarn command <command-name>
```

## Danh sách Commands

### 1. generate-image-chat-gpt

**Mô tả:** Tạo ảnh sử dụng ChatGPT

**Cách sử dụng:**

```bash
# Development mode
yarn command:dev generate-image-chat-gpt src/commands/setting.json

# Production mode (sau khi build)
yarn command generate-image-chat-gpt src/commands/setting.json
```

**File cấu hình:** `src/commands/setting.json`

```json
{
  "show_browser": true,
  "prompt": "Tạo cho tôi một bức ảnh của một con chim cánh cụt đang ngậm một cái bánh mì",
  "outputPath": "image.png"
}
```

**Tham số:**

- `file-settings`: Đường dẫn đến file JSON chứa cấu hình
  - `show_browser`: Hiển thị browser khi chạy (true/false)
  - `prompt`: Mô tả ảnh muốn tạo
  - `outputPath`: Đường dẫn lưu file ảnh

**Ví dụ:**

```bash
# Tạo ảnh với cấu hình mặc định
yarn command generate-image-chat-gpt src/commands/setting.json

# Tạo ảnh với file cấu hình tùy chỉnh
yarn command generate-image-chat-gpt ./my-settings.json
```
