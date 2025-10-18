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

    // Auto restart sau mỗi 2 giờ
    function scheduleAutoRestart() {
        const restartInterval = 2 * 60 * 60 * 1000; // 2 giờ = 2 * 60 * 60 * 1000 ms
        
        setInterval(() => {
            logger.log("🔄 Đã đến 2 giờ, chuẩn bị restart bot...", "warn");
            
            // Tìm và kill process hiện tại
            const { exec } = require("child_process");
            exec("taskkill /f /im node.exe", (error) => {
                if (error) {
                    logger.log(`Lỗi kill process: ${error.message}`, "warn");
                }
                
                // Chờ 3 giây rồi restart
                setTimeout(() => {
                    logger.log("🚀 Restarting bot sau 2 giờ...", "info");
                    startProject();
                }, 3000);
            });
        }, restartInterval);
        
        logger.log(`⏰ Đã lên lịch auto restart sau mỗi 2 giờ`, "info");
    }

    startProject();
    scheduleAutoRestart();
})();
