const { spawn } = require("child_process");
const logger = require("./utils/logger");
const semver = require("semver");
const schedule = require("node-schedule");
const { exec } = require("child_process");

(async () => {
    await logger.printBanner();

    const nodeVersion = semver.parse(process.version);
    if (nodeVersion.major < 20) {
        logger.log(`Phiên bản Node.js ${process.version} không hỗ trợ. Vui lòng sử dụng Node.js 20 trở lên.`, "error");
        return process.exit(1);
    }

    let childProcess = null;
    let restartJob = null;

    // Function để đóng port 3380 trước khi khởi động
    function killPort3380() {
        return new Promise((resolve) => {
            exec('netstat -ano | findstr :3380', (error, stdout) => {
                if (stdout) {
                    const lines = stdout.split('\n');
                    for (const line of lines) {
                        if (line.includes(':3380')) {
                            const parts = line.trim().split(/\s+/);
                            const pid = parts[parts.length - 1];
                            if (pid && pid !== '0') {
                                exec(`taskkill /PID ${pid} /F`, () => {
                                    logger.log(`Đã đóng process sử dụng port 3380 (PID: ${pid})`, "info");
                                    resolve();
                                });
                                return;
                            }
                        }
                    }
                }
                resolve();
            });
        });
    }

    async function startProject() {
        // Đóng port 3380 trước khi khởi động
        await killPort3380();
        
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

        // Tạo job mới restart sau 2 giờ
        restartJob = schedule.scheduleJob('0 */2 * * *', async function() {
            logger.log(`Tự động restart bot sau 2 giờ...`, "info");
            if (childProcess) {
                childProcess.kill('SIGTERM');
                // Đóng port 3380 trước khi restart
                await killPort3380();
                // Tăng thời gian delay để đảm bảo server cũ đóng hoàn toàn
                setTimeout(() => {
                    startProject();
                }, 5000);
            }
        });

        logger.log(`Đã lên lịch restart bot sau mỗi 2 giờ`, "info");
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
