const fs = require("fs");
const path = require("path");
const { Zalo } = require("zca-js");
const logger = require("../../utils/logger");
const { saveBase64Image, getJsonData } = require("../../utils/helpers");

async function loginWithQR() {
    try {
        const zalo = new Zalo(global.config.zca_js_config);
        const accountPath = path.join(__dirname, `../../../storage/auth/${global.config.account_file}`);
        fs.mkdirSync(path.dirname(accountPath), { recursive: true });

        const accountData = getJsonData(accountPath);
        const cookieFileName = accountData.cookie || "cookie.json";
        const cookiePath = path.join(__dirname, `../../../storage/auth/${cookieFileName}`);

        const api = await zalo.loginQR({}, (qrData) => {
            const { image, cookie, imei, userAgent, code } = qrData.data;

            if (image && !cookie) {
                const qrPath = path.join(__dirname, `../../../${global.config.qrcode_path}`);
                saveBase64Image(image, qrPath);
                logger.log(`Vui lòng quét mã QRCode ${path.basename(qrPath)} để đăng nhập`, "info");
                return;
            }
            if (userAgent && cookie && imei) {
                if (!global.config.save_cookie) return;

                try {
                    fs.writeFileSync(cookiePath, JSON.stringify(cookie, null, 2), "utf8");

                    const newAccountData = {
                        imei,
                        userAgent,
                        cookie: cookieFileName
                    };
                    fs.writeFileSync(accountPath, JSON.stringify(newAccountData, null, 2), "utf8");

                    logger.log(`Đã lưu cookie vào ${cookieFileName} và cập nhật ${path.basename(accountPath)}`, "info");
                } catch (err) {
                    logger.log(`Lỗi khi ghi file: ${err.message || err}`, "error");
                    process.exit(1);
                }
            }
        });

        return api;
    } catch (error) {
        logger.log(`Lỗi đăng nhập Zalo bằng QR: ${error.message || error}`, "error");
        process.exit(1);
    }
}

async function loginWithCookie() {
    try {
        const zalo = new Zalo(global.config.zca_js_config);
        const accountPath = path.join(__dirname, `../../../storage/auth/${global.config.account_file}`);
        fs.mkdirSync(path.dirname(accountPath), { recursive: true });

        // Kiểm tra và đọc file account
        if (!fs.existsSync(accountPath)) {
            logger.log(`File ${global.config.account_file} không tồn tại`, "warn");
            throw new Error(`File ${global.config.account_file} không tồn tại`);
        }

        const accountData = getJsonData(accountPath);

        // Kiểm tra dữ liệu account
        if (!accountData.imei || !accountData.userAgent || !accountData.cookie) {
            logger.log("Dữ liệu account không đầy đủ (thiếu imei, userAgent hoặc cookie)", "error");
            throw new Error("Dữ liệu account không đầy đủ");
        }

        const cookieFileName = accountData.cookie || "cookie.json";
        const cookiePath = path.join(__dirname, `../../../storage/auth/${cookieFileName}`);

        // Kiểm tra file cookie
        if (!fs.existsSync(cookiePath)) {
            logger.log(`File cookie ${cookieFileName} không tồn tại`, "warn");
            throw new Error(`File cookie ${cookieFileName} không tồn tại`);
        }

        const cookie = getJsonData(cookiePath);

        // Kiểm tra dữ liệu cookie
        if (!cookie || (Array.isArray(cookie) && cookie.length === 0) || Object.keys(cookie).length === 0) {
            logger.log("File cookie rỗng hoặc không hợp lệ", "error");
            throw new Error("File cookie rỗng hoặc không hợp lệ");
        }

        logger.log("Đang thử đăng nhập bằng cookie...", "info");
        const api = await zalo.login({
            cookie: cookie,
            imei: accountData.imei,
            userAgent: accountData.userAgent
        });

        logger.log("Đăng nhập bằng cookie thành công!", "info");
        return api;
    } catch (error) {
        logger.log(`Lỗi đăng nhập Zalo bằng Cookie: ${error.message || error}`, "error");
        throw error;
    }
}

async function login() {
    try {
        logger.log("Tiến hành login bằng Cookie", "info");
        return await loginWithCookie();
    } catch (error) {
        if (!global.config.login_qrcode) {
            logger.log("Cookie không hợp lệ", "error");
            process.exit(1);
        }
        logger.log("Login bằng Cookie thất bại, chuyển sang QRCode...", "warn");
        return await loginWithQR();
    }
}


module.exports = login;
