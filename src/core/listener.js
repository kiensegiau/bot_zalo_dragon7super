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

  api.listener.start();
  logger.log("Đã bắt đầu lắng nghe sự kiện", "info");
}

module.exports = startListening;
