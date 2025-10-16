# Hướng dẫn gửi tin nhắn từ server khác

## Cách hoạt động
- Bot khởi chạy HTTP server nội bộ trong `src/core/server.js`.
- Endpoint nhận yêu cầu và dùng API Zalo đã đăng nhập để gửi tin nhắn.

## Cấu hình
Sửa `config/default.yml`:

```yaml
server:
  host: "0.0.0.0"
  port: 3380
```

Hoặc đặt qua biến môi trường (ưu tiên hơn file cấu hình):

```bash
# Linux/macOS
export SERVER_HOST=0.0.0.0
export SERVER_PORT=3381
node .

# Windows PowerShell
$env:SERVER_HOST = "0.0.0.0"
$env:SERVER_PORT = "3381"
node .
```

Chạy bot:
```bash
node .
```

## Gửi tin nhắn (ví dụ dùng nhóm 1096161385895708787)
- POST `http://<ip-may-chay-bot>:3380/send`
- Header: `Content-Type: application/json`
- Body JSON đơn giản:
```json
{
  "threadId": "1096161385895708787",
  "type": "Group",
  "message": "Xin chào từ server khác!"
}
```

### Ví dụ lệnh
- curl:
```bash
curl -X POST "http://<ip-may-chay-bot>:3380/send" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "1096161385895708787",
    "type": "Group",
    "message": "Xin chào từ server khác!"
  }'
```

- PowerShell:
```powershell
curl -Method POST "http://<ip-may-chay-bot>:3380/send" `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"threadId":"1096161385895708787","type":"Group","message":"Xin chào từ server khác!"}'
```

## Nâng cao (tùy chọn)
- Dùng TTL (tự xóa sau N mili-giây):
```json
{
  "threadId": "1096161385895708787",
  "type": "Group",
  "message": { "msg": "Hello có TTL", "ttl": 10000 }
}
```
- Đính kèm file: `message.attachments` là đường dẫn file trên máy chạy bot.

## Lưu ý
- Endpoint hiện mở (không API key). Nên giới hạn trong mạng nội bộ hoặc cấu hình firewall nếu cần.

## Phản hồi mẫu khi thành công
```json
{
  "ok": true,
  "result": {
    "message": { "msgId": 7122689493415 },
    "attachment": []
  }
}
```

## Gửi tiếng Việt trên PowerShell (UTF-8)
```powershell
$json = '{"threadId":"1096161385895708787","type":"Group","message":"Xin chào, thử tiếng Việt: ă â ê ô ơ ư đ"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
Invoke-WebRequest -Uri 'http://<ip-may-chay-bot>:3380/send' -Method Post -ContentType 'application/json; charset=utf-8' -Body $bytes | Select-Object -ExpandProperty Content
```

## Kiểm tra nhanh
- Kiểm tra service nghe cổng (Windows VPS):
```powershell
Get-NetTCPConnection -LocalPort 3380
```

- Test nội bộ trên VPS:
```powershell
$body = '{"threadId":"1096161385895708787","type":"Group","message":"Ping noi bo"}'
Invoke-RestMethod -Uri 'http://127.0.0.1:3380/send' -Method Post -ContentType 'application/json' -Body $body
```

- Test từ ngoài (curl):
```bash
curl -X POST "http://<ip-may-chay-bot>:3380/send" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "threadId": "1096161385895708787",
    "type": "Group",
    "message": "Xin chào từ ngoài"
  }'
```
