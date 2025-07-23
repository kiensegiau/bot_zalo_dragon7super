const weatherAPI = require('../../utils/weather/api');
const weatherStorage = require('../../utils/weather/storage');
const weatherScheduler = require('../../utils/weather/scheduler');

module.exports.config = {
    name: "weatheradmin",
    version: "1.0.0",
    role: 2, // Admin only
    author: "Dragon7 Bot Team",
    description: "Quản lý hệ thống thời tiết (Admin only)",
    category: "Admin",
    usage: "weatheradmin [test|validate|stats|send] [userId]",
    cooldowns: 5,
    dependencies: {}
};

module.exports.run = async ({ args, event, api }) => {
    const { threadId, type } = event;
    const userId = event.data.uidFrom;

    // Kiểm tra quyền admin
    if (!global.users.admin.includes(userId)) {
        return api.sendMessage("🚫 Bạn không có quyền sử dụng lệnh này!", threadId, type);
    }

    const action = args[0]?.toLowerCase();

    try {
        switch (action) {
            case 'test':
                await handleTestWeather(args[1] || userId, api, threadId, type);
                break;
            
            case 'validate':
                await handleValidateAPI(api, threadId, type);
                break;
            
            case 'stats':
                await handleShowStats(api, threadId, type);
                break;
            
            case 'send':
                await handleForceSend(api, threadId, type);
                break;
            
            case 'jobs':
                await handleShowJobs(api, threadId, type);
                break;
            
            default:
                await showAdminMenu(api, threadId, type);
                break;
        }
    } catch (error) {
        console.error('Lỗi trong weatheradmin:', error);
        api.sendMessage(`❌ Có lỗi xảy ra: ${error.message}`, threadId, type);
    }
};

/**
 * Hiển thị menu admin
 */
async function showAdminMenu(api, threadId, type) {
    const menu = `🔧 **WEATHER ADMIN PANEL** 🔧\n\n` +
                 `📋 **Các lệnh có sẵn:**\n\n` +
                 `🧪 /weatheradmin test [userId]\n` +
                 `   └ Test gửi thời tiết cho user\n\n` +
                 `✅ /weatheradmin validate\n` +
                 `   └ Kiểm tra API key có hợp lệ\n\n` +
                 `📊 /weatheradmin stats\n` +
                 `   └ Xem thống kê hệ thống\n\n` +
                 `📤 /weatheradmin send\n` +
                 `   └ Gửi thời tiết ngay lập tức cho tất cả users\n\n` +
                 `⏰ /weatheradmin jobs\n` +
                 `   └ Xem thông tin scheduled jobs\n\n` +
                 `💡 **Lưu ý:** Chỉ admin mới có thể sử dụng!`;

    return api.sendMessage(menu, threadId, type);
}

/**
 * Test gửi thời tiết cho user
 */
async function handleTestWeather(targetUserId, api, threadId, type) {
    try {
        api.sendMessage("🧪 Đang test gửi thời tiết...", threadId, type);
        
        const result = await weatherScheduler.sendTestWeather(targetUserId);
        
        const message = result.success ? 
            `✅ Test thành công!\n${result.message}` : 
            `❌ Test thất bại!\n${result.message}`;
        
        return api.sendMessage(message, threadId, type);
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi test: ${error.message}`, threadId, type);
    }
}

/**
 * Kiểm tra API key
 */
async function handleValidateAPI(api, threadId, type) {
    try {
        api.sendMessage("🔍 Đang kiểm tra API key...", threadId, type);
        
        const isValid = await weatherAPI.validateApiKey();
        
        const message = isValid ? 
            "✅ API key hợp lệ! Hệ thống thời tiết hoạt động bình thường." : 
            "❌ API key không hợp lệ! Vui lòng kiểm tra lại cấu hình.";
        
        return api.sendMessage(message, threadId, type);
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi kiểm tra API: ${error.message}`, threadId, type);
    }
}

/**
 * Hiển thị thống kê hệ thống
 */
async function handleShowStats(api, threadId, type) {
    try {
        const usersWithNotify = await weatherStorage.getAllUsersWithAutoNotify();
        
        let totalCities = 0;
        let activeUsers = 0;
        
        for (const user of usersWithNotify) {
            if (user.cities && user.cities.length > 0) {
                activeUsers++;
                totalCities += user.cities.length;
            }
        }
        
        const stats = `📊 **THỐNG KÊ HỆ THỐNG THỜI TIẾT** 📊\n\n` +
                     `👥 **Users đang sử dụng:** ${activeUsers}\n` +
                     `🏙️ **Tổng số thành phố:** ${totalCities}\n` +
                     `🔔 **Users bật thông báo:** ${usersWithNotify.length}\n` +
                     `⚙️ **API Provider:** ${global.config.weather_api?.provider || 'Chưa cấu hình'}\n` +
                     `🌐 **Ngôn ngữ:** ${global.config.weather_api?.default_lang || 'vi'}\n` +
                     `⏱️ **Cache duration:** ${global.config.weather_api?.cache_duration || 300}s\n\n` +
                     `📈 **Trung bình:** ${activeUsers > 0 ? (totalCities / activeUsers).toFixed(1) : 0} thành phố/user`;
        
        return api.sendMessage(stats, threadId, type);
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi lấy thống kê: ${error.message}`, threadId, type);
    }
}

/**
 * Gửi thời tiết ngay lập tức
 */
async function handleForceSend(api, threadId, type) {
    try {
        api.sendMessage("📤 Đang gửi thời tiết cho tất cả users...", threadId, type);
        
        await weatherScheduler.sendDailyWeatherNotifications();
        
        return api.sendMessage("✅ Đã gửi thời tiết thành công!", threadId, type);
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi gửi thời tiết: ${error.message}`, threadId, type);
    }
}

/**
 * Hiển thị thông tin jobs
 */
async function handleShowJobs(api, threadId, type) {
    try {
        const jobs = weatherScheduler.getJobsInfo();
        
        let message = `⏰ **THÔNG TIN SCHEDULED JOBS** ⏰\n\n`;
        
        if (jobs.length === 0) {
            message += "❌ Không có job nào đang chạy!";
        } else {
            jobs.forEach((job, index) => {
                const nextRun = job.nextInvocation ? 
                    job.nextInvocation.toLocaleString('vi-VN') : 
                    'Không xác định';
                
                message += `${index + 1}. **${job.name}**\n`;
                message += `   └ Chạy tiếp theo: ${nextRun}\n\n`;
            });
        }
        
        return api.sendMessage(message, threadId, type);
    } catch (error) {
        return api.sendMessage(`❌ Lỗi khi lấy thông tin jobs: ${error.message}`, threadId, type);
    }
}
