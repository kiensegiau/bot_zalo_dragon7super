const fs = require("fs");
const path = require("path");
const logger = require("../../utils/logger");
const { cleanAuthFiles } = require("../../utils/helpers");

module.exports.config = {
    name: 'logout',
    version: '1.0.0',
    role: 2,
    author: 'Augment Agent',
    description: 'Đăng xuất và xóa thông tin đăng nhập',
    category: 'Hệ thống',
    usage: 'logout',
    cooldowns: 5,
    dependencies: {}
};

module.exports.run = async ({ event, api }) => {
    const { threadId, type } = event;

    try {
        // Thông báo bắt đầu logout
        await api.sendMessage({
            msg: "🔄 Đang tiến hành đăng xuất...",
            ttl: 5000
        }, threadId, type);

        // Gửi tin nhắn hoàn thành trước khi tắt
        await api.sendMessage({
            msg: "✅ Đã đăng xuất thành công!\n� Bot sẽ tắt ngay...",
            ttl: 3000
        }, threadId, type);

        // Delay ngắn để tin nhắn được gửi
        setTimeout(async () => {
            try {
                // Dừng listener
                if (api.listener && typeof api.listener.stop === 'function') {
                    api.listener.stop();
                    logger.log("Đã dừng listener", "info");
                }

                // Xóa các file auth
                const cleanResult = cleanAuthFiles();

                if (cleanResult) {
                    logger.log("Đã xóa tất cả file authentication", "info");
                } else {
                    logger.log("Có lỗi khi xóa một số file", "warn");
                }

                logger.log("Đăng xuất hoàn tất, tắt chương trình...", "warn");

                // Exit với code 0 để tắt hoàn toàn (không restart)
                process.exit(0);

            } catch (cleanupError) {
                logger.log(`Lỗi trong quá trình cleanup: ${cleanupError.message}`, "error");
                process.exit(0); // Vẫn tắt dù có lỗi
            }
        }, 1000); // Giảm delay xuống 1 giây

    } catch (error) {
        logger.log(`Lỗi khi đăng xuất: ${error.message}`, "error");
        try {
            await api.sendMessage({
                msg: `❌ Lỗi khi đăng xuất: ${error.message}`,
                ttl: 10000
            }, threadId, type);
        } catch (sendError) {
            logger.log(`Không thể gửi tin nhắn lỗi: ${sendError.message}`, "error");
        }

        // Tắt chương trình dù có lỗi
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    }
};
