const chalk = require("chalk");
const moment = require("moment-timezone");
const fetch = require("node-fetch");

module.exports.config = {
    event_type: ["message"],
    name: "log",
    version: "1.0.1",
    author: "Jukaza208",
    description: "Log tin nhắn lên console",
    dependencies: {
        "moment-timezone": "",
        "chalk": "",
        "node-fetch": "2"
    }
};

module.exports.run = async function({ api, event }) {
    const { threadId, data, type } = event;
    const time = moment.tz("Asia/Ho_Chi_Minh").format("D/MM/YYYY HH:mm:ss");

    const senderName = data.dName || "Không rõ";
    let content;

    if (typeof data.content === "string") {
        content = data.content;
    } else if (typeof data.content?.title === "string") {
        content = data.content.title;
    } else {
        content = "[Không phải tin nhắn văn bản]";
    }

    // Xử lý lệnh check gmail cho group được phép
    const allowedGroupId = process.env.ALLOWED_GROUP_ID || (global.config && global.config.allowed_group_id) || "1096161385895708787";
    if (String(threadId) === String(allowedGroupId) && typeof content === "string") {
        const text = content.trim();
        if (text.toLowerCase().startsWith("check ")) {
            console.log(chalk.blue(`[CHECK GMAIL] ${senderName}: ${text}`));
            
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
                const preferredType = type;
                const altType = preferredType === ThreadType.User ? ThreadType.Group : ThreadType.User;

                let res;
                try {
                    res = await api.sendMessage({ msg: reply, ttl: 15000 }, threadId, preferredType);
                    console.log(chalk.green(`[SENT] Phản hồi check gmail (type=${preferredType}): ${JSON.stringify(res)}`));
                } catch (e1) {
                    console.log(chalk.yellow(`[FALLBACK] Gửi với type=${preferredType} lỗi: ${e1?.message || e1}. Thử type=${altType}`));
                    res = await api.sendMessage({ msg: reply, ttl: 15000 }, threadId, altType);
                    console.log(chalk.green(`[SENT] Phản hồi check gmail (fallback type=${altType}): ${JSON.stringify(res)}`));
                }

                // Nếu là gmail hợp lệ, gọi API tạo user
                if (isEmail && isGmail) {
                    try {
                        const rawUrl = process.env.USER_API_URL || 'https://admin.khoahocshares.com/api/users';
                        const apiKey = process.env.USER_API_KEY || 'change-me-strong-key';
                        const url = rawUrl.startsWith('https://http://') ? rawUrl.replace('https://http://', 'http://') : rawUrl;

                        const generatedPassword = String(Math.floor(1000000 + Math.random() * 9000000));
                        const payload = {
                            email,
                            password: generatedPassword,
                            "accountType": "trial",
                            "canViewAllCourses": true,
                            phoneNumber: '',
                            createdBy: 'admin@khoahocshares.com'
                        };

                        console.log(chalk.blue(`[API] Đang tạo tài khoản cho: ${email}`));
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': apiKey
                            },
                            body: JSON.stringify(payload)
                        });

                        const textResp = await response.text();
                        console.log(chalk[response.ok ? 'green' : 'red'](`[API] Response ${response.status}: ${textResp}`));

                        // Gửi thông báo kết quả
                        try {
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

                            try { 
                                await api.sendMessage({ msg: msgToSend }, threadId, preferredType);
                                console.log(chalk.green(`[SENT] Thông báo kết quả tạo tài khoản`));
                            }
                            catch (_) { 
                                await api.sendMessage({ msg: msgToSend }, threadId, altType);
                                console.log(chalk.green(`[SENT] Thông báo kết quả tạo tài khoản (fallback)`));
                            }
                        } catch (e2) {
                            console.log(chalk.red(`[ERROR] Lỗi gửi thông báo kết quả: ${e2?.message || e2}`));
                        }
                    } catch (e) {
                        console.log(chalk.red(`[ERROR] Gọi User API lỗi: ${e?.message || e}`));
                    }
                }
            } catch (err) {
                console.log(chalk.red(`[ERROR] Lỗi gửi phản hồi check gmail: ${err?.message || err}`));
            }
        }
    }

    // Log tin nhắn bình thường
    let message;

    if (type == 0) {
        message = chalk.yellow(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 Tin nhắn riêng từ: ${senderName}
 Người dùng: ${senderName}
 Nội dung: ${content}
 Thời gian: ${time}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
    } else {
        let groupName;
        try {
            const groupInfo = await api.getGroupInfo(threadId);
            groupName = groupInfo?.gridInfoMap?.[threadId]?.name || "Tên nhóm không xác định";
        } catch {
            groupName = "Không lấy được tên nhóm";
        }

        message = chalk.green(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 Nhóm: ${groupName}
 Người dùng: ${senderName}
 Nội dung: ${content}
 Thời gian: ${time}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛`);
    }

    console.log(message);
};
