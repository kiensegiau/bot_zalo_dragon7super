const fs = require("fs");
const path = require("path");
const YAML = require("yaml");
const login = require("./core/auth/login");
const logger = require("./utils/logger");
const listener = require("./core/listener");
const loaderCommand = require("./core/loaders/command");
const loaderEvent = require("./core/loaders/event");
const schedule = require("node-schedule");
const { cleanOldMessages } = require("./utils/helpers");
const weatherScheduler = require("./utils/weather/scheduler");
const { createServer } = require("./core/server");

global.client = new Object({
    commands: new Map(),
    events: new Map(),
    cooldowns: new Map()
});

global.users = {
  admin: [],
  support: []
};

global.config = new Object();

(async () => {

try {
    const configPath = path.join(__dirname, "../config/default.yml");
    const fileContent = fs.readFileSync(configPath, "utf8");
    const config = YAML.parse(fileContent);

    global.config = config;
    global.users = {
      admin: Array.isArray(config.admin_bot) ? config.admin_bot.map(String) : [],
      support: Array.isArray(config.support_bot) ? config.support_bot.map(String) : []
    };
    logger.log("Đã tải cấu hình từ config.yml thành công", "info");
} catch (error) {
    logger.log(`Lỗi khi đọc config.yml: ${error.message || error}`, "error");
    process.exit(1);
}

logger.log("\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓");
for (let i = 0; i <= global.users.admin.length - 1; i++) {
    dem = i + 1;
    logger.log(` ID ADMIN ${dem}: ${!global.users.admin[i] ? "Trống" : global.users.admin[i]}`);
}
for (let i = 0; i <= global.users.support.length - 1; i++) {
    dem = i + 1;
    logger.log(` ID SUPPORT ${dem}: ${!global.users.support[i] ? "Trống" : global.users.support[i]}`);
}
logger.log(` NAME BOT: ${global.config.name_bot}`);
logger.log(` PREFIX: ${global.config.prefix}`)
logger.log("┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n");

schedule.scheduleJob("0 * * * * *", () => {
    cleanOldMessages();
});

let api;
try {
    api = await login();
    logger.log("Đã đăng nhập thành công", "info");
} catch (error) {
    logger.log("Đăng nhập thất bại!", "error");
    logger.log("Có thể do:", "warn");
    logger.log("- File cookie không tồn tại hoặc hết hạn", "warn");
    logger.log("- File account.json thiếu thông tin", "warn");
    logger.log("- Kết nối mạng không ổn định", "warn");
    logger.log("Hãy sử dụng lệnh /authstatus để kiểm tra chi tiết", "info");
    process.exit(1);
}

// Bỏ tải lệnh và sự kiện; chỉ bật listener để bắt tin nhắn đến
// await loaderCommand();
// await loaderEvent();
// weatherScheduler.init(api);
listener(api);

// Khởi chạy server nhận yêu cầu gửi tin nhắn từ ngoài
try {
    createServer(api);
} catch (e) {
    logger.log(`Không thể khởi chạy server gửi tin nhắn: ${e.message || e}`, "error");
}

})();
