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
