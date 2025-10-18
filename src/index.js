const { spawn } = require("child_process");
const logger = require("./utils/logger");
const semver = require("semver");

(async () => {
    await logger.printBanner();

    const nodeVersion = semver.parse(process.version);
    if (nodeVersion.major < 20) {
        logger.log(`Phiên bản Node.js ${process.version} không hỗ trợ. Vui lòng sử dụng Node.js 20 trở lên.`, "error");
        return process.exit(1);
    }

    function startProject() {
        const child = spawn("node", ["src/app.js"], {
            cwd: process.cwd(),
            stdio: "inherit",
            shell: true
        });

        child.on("close", (code) => {
            if (code === 2) {
                logger.log(`Khởi động lại...`, "warn");
                startProject();
            }
        });

        return child;
    }

    let currentChild = null;

    // Auto restart sau mỗi 2 giờ
    function scheduleAutoRestart() {
        const restartInterval = 60 * 60 * 1000; // 1 giờ = 60 * 60 * 1000 ms
        
        setInterval(() => {
            logger.log("🔄 Đã đến 1 giờ, chuẩn bị restart bot...", "warn");
            
            // Dừng bot hiện tại
            if (currentChild && !currentChild.killed) {
                currentChild.kill('SIGTERM');
                logger.log("🛑 Đã dừng bot hiện tại", "info");
            }
            
            // Chờ 3 giây rồi khởi động lại
            setTimeout(() => {
                logger.log("🚀 Restarting bot sau 1 giờ...", "info");
                currentChild = startProject();
            }, 3000);
        }, restartInterval);
        
        logger.log(`⏰ Đã lên lịch auto restart sau mỗi 1 giờ`, "info");
    }

    currentChild = startProject();
    scheduleAutoRestart();
})();
