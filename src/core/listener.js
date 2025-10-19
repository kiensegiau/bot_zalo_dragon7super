const handleCommand = require("./handlers/command");
const handleEvent = require("./handlers/event");
const logger = require("../utils/logger");
const { updateMessageCache } = require("../utils/helpers");

const Users = require("./controllers/users");
const Threads = require("./controllers/threads");

function startListening(api) {
  if (!api?.listener?.on || !api.listener.start) {
    logger.log("API listener không hợp lệ.", "error");
    return;
  }

  // Biến để theo dõi trạng thái listener
  let isListening = false;
  let reconnectAttempts = 0;
  let reconnectTimeout = null;
  let heartbeatInterval = null;
  const maxReconnectAttempts = 10; // Tăng số lần thử
  const reconnectDelay = 15000; // Giảm thời gian chờ xuống 15 giây
  const heartbeatIntervalMs = 60000; // Kiểm tra mỗi 1 phút

  // Hàm cleanup
  function cleanup() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // Hàm khởi động listener
  function startListener() {
    try {
      if (isListening) {
        logger.log("Listener đã đang chạy, bỏ qua khởi động", "warn");
        return;
      }

      // Cleanup trước khi start
      cleanup();

      api.listener.start();
      isListening = true;
      reconnectAttempts = 0;
      logger.log("Đã bắt đầu lắng nghe sự kiện", "info");

      // Khởi động heartbeat
      startHeartbeat();
    } catch (error) {
      logger.log(`Lỗi khởi động listener: ${error?.message || error}`, "error");
      isListening = false;
      scheduleReconnect();
    }
  }

  // Hàm khởi động heartbeat - chỉ kiểm tra trạng thái listener
  function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
      if (!isListening) {
        logger.log("Phát hiện listener không hoạt động, thử khởi động lại", "warn");
        startListener();
      } else {
        logger.log("Heartbeat: Listener đang hoạt động bình thường", "debug");
      }
    }, heartbeatIntervalMs);
  }

  // Hàm lên lịch reconnect
  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      logger.log(`Đã thử reconnect ${maxReconnectAttempts} lần, dừng thử lại`, "error");
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    reconnectAttempts++;
    const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts - 1), 300000); // Exponential backoff, max 5 phút
    logger.log(`Sẽ thử reconnect sau ${delay/1000} giây (lần ${reconnectAttempts}/${maxReconnectAttempts})`, "warn");
    
    reconnectTimeout = setTimeout(() => {
      logger.log("Đang thử reconnect listener...", "info");
      startListener();
    }, delay);
  }

  // Xử lý lỗi listener
  api.listener.on("error", (error) => {
    logger.log(`Listener gặp lỗi: ${error?.message || error}`, "error");
    isListening = false;
    scheduleReconnect();
  });

  // Xử lý khi listener dừng
  api.listener.on("close", () => {
    logger.log("Listener đã đóng kết nối", "warn");
    isListening = false;
    scheduleReconnect();
  });

  api.listener.on("message", async (event) => {
    updateMessageCache(event);
    let threadData;

    threadData = await Threads.getData(event.threadId);

    const threadInfo = threadData?.data || {};
    const prefix = threadInfo.prefix ? threadInfo.prefix : global.config.prefix;

    handleEvent("message", event, api);

    const { data } = event;
    const content = data?.content;

    // Cho phép duy nhất 1 group
    const allowedGroupId = process.env.ALLOWED_GROUP_ID || (global.config && global.config.allowed_group_id) || "1096161385895708787";
    if (String(event.threadId) !== String(allowedGroupId)) return;

    // Log đơn giản mỗi khi có tin nhắn dạng text đến
    if (typeof content === "string") {
      logger.log(`Tin nhắn đến [${event.type}] thread=${event.threadId}: ${content}`, "info");

      // Kiểm tra định dạng: "check <gmail>"
      const text = content.trim();
      if (text.toLowerCase().startsWith("check ")) {
        logger.log(`Match pattern 'check <gmail>': ${text}`, "info");
        const email = text.slice(6).trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isGmail = /@gmail\.com$/i.test(email);

        let reply;
        if (!isEmail) {
          reply = `❌ Định dạng email không hợp lệ. Ví dụ: check ten@gmail.com`;
        } else if (!isGmail) {
          reply = `⚠️ Chỉ chấp nhận Gmail. Bạn gửi: ${email}`;
        } else {
          reply = `✅ Gmail hợp lệ: ${email}`;
        }

        try {
          const { ThreadType } = require("zca-js");
          const preferredType = event.type;
          const altType = preferredType === ThreadType.User ? ThreadType.Group : ThreadType.User;

          let res;
          try {
            res = await api.sendMessage({ msg: reply, ttl: 15000 }, event.threadId, preferredType);
            logger.log(`Đã phản hồi kiểm tra gmail (type=${preferredType}): ${JSON.stringify(res)}`, "info");
          } catch (e1) {
            logger.log(`Gửi với type=${preferredType} lỗi: ${e1?.message || e1}. Thử type=${altType}`, "warn");
            res = await api.sendMessage({ msg: reply, ttl: 15000 }, event.threadId, altType);
            logger.log(`Đã phản hồi kiểm tra gmail (fallback type=${altType}): ${JSON.stringify(res)}`, "info");
          }
        } catch (err) {
          logger.log(`Lỗi gửi phản hồi kiểm tra gmail (cả 2 type): ${err?.message || err}`, "error");
        }

        // Nếu là gmail hợp lệ, gọi API tạo user theo yêu cầu
        if (isEmail && isGmail) {
          try {
            const rawUrl = process.env.USER_API_URL || 'https://admin.khoahocshares.com/api/users';
            const apiKey = process.env.USER_API_KEY || 'change-me-strong-key';
            const url = rawUrl.startsWith('https://http://') ? rawUrl.replace('https://http://', 'http://') : rawUrl;

            const generatedPassword = String(Math.floor(1000000 + Math.random() * 9000000));
            const payload = {
              email,
              password: generatedPassword,
              "accountType":"trial",
    "canViewAllCourses": true,
              phoneNumber: '',
              createdBy: 'admin@khoahocshares.com'
            };

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey
              },
              body: JSON.stringify(payload)
            });

            const textResp = await response.text();
            logger.log(`User API response ${response.status}: ${textResp}`, response.ok ? 'info' : 'warn');

            // Gửi thông báo về nhóm theo kết quả API (kèm link nhóm hỗ trợ)
            try {
              const { ThreadType } = require('zca-js');
              const preferredType = event.type;
              const altType = preferredType === ThreadType.User ? ThreadType.Group : ThreadType.User;
              const supportLink = 'https://zalo.me/g/qkbbsy233';

              let msgToSend;
              if (response.ok) {
                msgToSend = [
                  '✅ Tạo tài khoản thành công',
                  `• Email: ${email}`,
                  `• Mật khẩu: ${generatedPassword}`,
                  `🔗 Nhóm hỗ trợ: ${supportLink}`,
                  `🔗 Link khóa học: https://khoahocshares.com`

                ].join('\n');
              } else {
                let detail = textResp || '';
                if (detail.length > 300) detail = detail.slice(0, 300) + '...';
                msgToSend = [
                  `❌ Tạo tài khoản thất bại (${response.status})`,
                  detail,
                  `🔗 Nhóm hỗ trợ: ${supportLink}`
                ].filter(Boolean).join('\n');
              }

              try { await api.sendMessage({ msg: msgToSend }, event.threadId, preferredType); }
              catch (_) { await api.sendMessage({ msg: msgToSend }, event.threadId, altType); }
            } catch (e2) {
              logger.log(`Lỗi gửi thông báo kết quả tạo tài khoản: ${e2?.message || e2}`, 'error');
            }
          } catch (e) {
            logger.log(`Gọi User API lỗi: ${e?.message || e}`, 'error');
          }
        }
      }
    }

    if (typeof content === "string" && content.startsWith(prefix)) {
      handleCommand(content, event, api, threadInfo, prefix);
    }
  });


  api.listener.on("group_event", (event) => {
    handleEvent("group_event", event, api);
  });

  api.listener.on("reaction", (event) => {
    handleEvent("reaction", event, api);
  });

  api.listener.on("undo", (event) => {
    handleEvent("undo", event, api);
  });

  // Xử lý khi process thoát
  process.on('SIGINT', () => {
    logger.log("Đang dừng listener...", "info");
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.log("Đang dừng listener...", "info");
    cleanup();
    process.exit(0);
  });

  // Khởi động listener ban đầu
  startListener();
}

module.exports = startListening;
