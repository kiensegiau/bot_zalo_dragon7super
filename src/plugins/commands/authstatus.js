const fs = require("fs");
const path = require("path");
const { validateAuthFiles } = require("../../utils/helpers");

module.exports.config = {
    name: 'authstatus',
    version: '1.0.0',
    role: 2,
    author: 'Augment Agent',
    description: 'Kiểm tra trạng thái file authentication',
    category: 'Hệ thống',
    usage: 'authstatus',
    cooldowns: 3,
    dependencies: {}
};

module.exports.run = async ({ event, api }) => {
    const { threadId, type } = event;

    try {
        const authDir = path.join(__dirname, "../../../storage/auth");
        const accountPath = path.join(authDir, global.config.account_file);
        const cookiePath = path.join(authDir, "cookie.json");
        const qrPath = path.join(__dirname, `../../../${global.config.qrcode_path}`);

        // Kiểm tra validation
        const validation = validateAuthFiles();
        
        let msg = "🔍 **TRẠNG THÁI AUTHENTICATION**\n\n";
        
        // Trạng thái tổng quan
        if (validation.valid) {
            msg += "✅ **Trạng thái**: Hợp lệ\n";
        } else {
            msg += "❌ **Trạng thái**: Không hợp lệ\n";
            msg += `📝 **Lý do**: ${validation.reason}\n`;
        }
        
        msg += "\n📁 **CHI TIẾT FILE**:\n";
        
        // Kiểm tra file account
        if (fs.existsSync(accountPath)) {
            const stats = fs.statSync(accountPath);
            msg += `✅ ${global.config.account_file}: Tồn tại (${Math.round(stats.size / 1024)}KB)\n`;
            
            try {
                const accountData = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
                msg += `   - IMEI: ${accountData.imei ? '✅' : '❌'}\n`;
                msg += `   - UserAgent: ${accountData.userAgent ? '✅' : '❌'}\n`;
                msg += `   - Cookie file: ${accountData.cookie || 'cookie.json'}\n`;
            } catch (e) {
                msg += `   - ❌ Lỗi đọc file: ${e.message}\n`;
            }
        } else {
            msg += `❌ ${global.config.account_file}: Không tồn tại\n`;
        }
        
        // Kiểm tra file cookie
        if (fs.existsSync(cookiePath)) {
            const stats = fs.statSync(cookiePath);
            msg += `✅ cookie.json: Tồn tại (${Math.round(stats.size / 1024)}KB)\n`;
            
            try {
                const cookieData = JSON.parse(fs.readFileSync(cookiePath, 'utf8'));
                const cookieCount = Array.isArray(cookieData) ? cookieData.length : Object.keys(cookieData).length;
                msg += `   - Số lượng cookie: ${cookieCount}\n`;
            } catch (e) {
                msg += `   - ❌ Lỗi đọc cookie: ${e.message}\n`;
            }
        } else {
            msg += "❌ cookie.json: Không tồn tại\n";
        }
        
        // Kiểm tra file QR
        if (fs.existsSync(qrPath)) {
            const stats = fs.statSync(qrPath);
            msg += `✅ ${global.config.qrcode_path}: Tồn tại (${Math.round(stats.size / 1024)}KB)\n`;
        } else {
            msg += `⚪ ${global.config.qrcode_path}: Không tồn tại\n`;
        }
        
        msg += "\n💡 **GỢI Ý**:\n";
        if (!validation.valid) {
            msg += "- Sử dụng lệnh `/logout` để xóa file cũ\n";
            msg += "- Khởi động lại bot để login lại\n";
        } else {
            msg += "- Tất cả file authentication đều hợp lệ\n";
        }

        await api.sendMessage({
            msg: msg,
            ttl: 60000  // Tự xóa sau 60 giây
        }, threadId, type);

    } catch (error) {
        await api.sendMessage({
            msg: `❌ Lỗi khi kiểm tra auth status: ${error.message}`,
            ttl: 30000
        }, threadId, type);
    }
};
