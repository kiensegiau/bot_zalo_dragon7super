const { spawn } = require("child_process");
const logger = require("./utils/logger");
const semver = require("semver");
const schedule = require("node-schedule");

(async () => {
    await logger.printBanner();

    const nodeVersion = semver.parse(process.version);
    if (nodeVersion.major < 20) {
        logger.log(`Phiên bản Node.js ${process.version} không hỗ trợ. Vui lòng sử dụng Node.js 20 trở lên.`, "error");
        return process.exit(1);
    }

    let childProcess = null;
    let restartJob = null;

    function startProject() {
        childProcess = spawn("node", ["src/app.js"], {
            cwd: process.cwd(),
            stdio: "inherit",
            shell: true
        });

        childProcess.on("close", (code) => {
            if (code === 2) {
                logger.log(`Khởi động lại...`, "warn");
                startProject();
            }
        });

        // Lên lịch restart sau 1 giờ
        scheduleRestart();
    }

    function scheduleRestart() {
        // Hủy job cũ nếu có
        if (restartJob) {
            restartJob.cancel();
        }

        // Tạo job mới restart sau 5 giây (để test)
        restartJob = schedule.scheduleJob('*/5 * * * * *', function() {
            logger.log(`Tự động restart bot sau 5 giây...`, "info");
            if (childProcess) {
                childProcess.kill('SIGTERM');
                setTimeout(() => {
                    startProject();
                }, 2000);
            }
        });

        logger.log(`Đã lên lịch restart bot sau mỗi 5 giây (test mode)`, "info");
    }

    // Xử lý tín hiệu dừng
    process.on('SIGINT', () => {
        logger.log(`Đang dừng bot...`, "warn");
        if (restartJob) {
            restartJob.cancel();
        }
        if (childProcess) {
            childProcess.kill('SIGTERM');
        }
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        logger.log(`Đang dừng bot...`, "warn");
        if (restartJob) {
            restartJob.cancel();
        }
        if (childProcess) {
            childProcess.kill('SIGTERM');
        }
        process.exit(0);
    });

    startProject();
})();
