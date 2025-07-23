const schedule = require('node-schedule');
const weatherAPI = require('./api');
const weatherStorage = require('./storage');
const logger = require('../logger');

class WeatherScheduler {
    constructor() {
        this.api = null;
        this.jobs = new Map();
    }

    /**
     * Khởi tạo scheduler với API instance
     * @param {Object} api - ZCA API instance
     */
    init(api) {
        this.api = api;

        // Khởi tạo weatherAPI với config
        weatherAPI.init();

        this.setupDailyWeatherJob();
        this.setupCacheCleanupJob();
        logger.log("Weather scheduler đã được khởi tạo", "info");
    }

    /**
     * Thiết lập job gửi thời tiết hàng ngày
     */
    setupDailyWeatherJob() {
        // Chạy lúc 6:00 AM mỗi ngày (giờ Việt Nam)
        const job = schedule.scheduleJob('0 6 * * *', async () => {
            logger.log("Bắt đầu gửi thời tiết tự động 6h sáng", "info");
            await this.sendDailyWeatherNotifications();
        });

        this.jobs.set('daily_weather', job);
        logger.log("Đã thiết lập job gửi thời tiết hàng ngày lúc 6:00 AM", "info");
    }

    /**
     * Thiết lập job dọn dẹp cache
     */
    setupCacheCleanupJob() {
        // Dọn dẹp cache mỗi 30 phút
        const job = schedule.scheduleJob('*/30 * * * *', () => {
            weatherAPI.clearOldCache();
            logger.log("Đã dọn dẹp cache thời tiết", "info");
        });

        this.jobs.set('cache_cleanup', job);
        logger.log("Đã thiết lập job dọn dẹp cache mỗi 30 phút", "info");
    }

    /**
     * Gửi thông báo thời tiết hàng ngày cho tất cả users
     */
    async sendDailyWeatherNotifications() {
        try {
            if (!this.api) {
                logger.log("API chưa được khởi tạo cho weather scheduler", "error");
                return;
            }

            // Kiểm tra cấu hình API
            if (!global.config.weather_api || !global.config.weather_api.api_key || 
                global.config.weather_api.api_key === "YOUR_API_KEY_HERE") {
                logger.log("Weather API chưa được cấu hình", "warn");
                return;
            }

            const usersWithNotify = weatherStorage.getAllUsersWithAutoNotify();
            
            if (usersWithNotify.length === 0) {
                logger.log("Không có user nào bật thông báo thời tiết tự động", "info");
                return;
            }

            logger.log(`Bắt đầu gửi thời tiết cho ${usersWithNotify.length} users`, "info");

            let successCount = 0;
            let errorCount = 0;

            for (const user of usersWithNotify) {
                try {
                    await this.sendWeatherToUser(user);
                    successCount++;
                    
                    // Delay giữa các lần gửi để tránh spam
                    await this.delay(2000);
                } catch (error) {
                    logger.log(`Lỗi khi gửi thời tiết cho user ${user.userId}: ${error.message}`, "error");
                    errorCount++;
                }
            }

            logger.log(`Hoàn thành gửi thời tiết: ${successCount} thành công, ${errorCount} lỗi`, "info");

        } catch (error) {
            logger.log(`Lỗi trong sendDailyWeatherNotifications: ${error.message}`, "error");
        }
    }

    /**
     * Gửi thời tiết cho một user cụ thể
     * @param {Object} user - Thông tin user và cities
     */
    async sendWeatherToUser(user) {
        try {
            const { userId, cities } = user;
            
            if (!cities || cities.length === 0) {
                return;
            }

            let weatherMessages = [];
            
            // Lấy thời tiết cho từng thành phố
            for (const city of cities) {
                try {
                    const weather = await weatherAPI.getCurrentWeather(city.lat, city.lon);
                    const shortMessage = this.formatShortWeatherMessage(weather);
                    weatherMessages.push(shortMessage);
                    
                    // Delay nhỏ giữa các API calls
                    await this.delay(500);
                } catch (error) {
                    logger.log(`Lỗi khi lấy thời tiết cho ${city.display_name}: ${error.message}`, "error");
                    weatherMessages.push(`❌ ${city.display_name}: Không thể lấy dữ liệu`);
                }
            }

            if (weatherMessages.length === 0) {
                return;
            }

            // Tạo tin nhắn tổng hợp
            const finalMessage = this.createDailyWeatherSummary(weatherMessages);
            
            // Gửi tin nhắn cho user (private message)
            await this.api.sendMessage(finalMessage, userId, "User");
            
            logger.log(`Đã gửi thời tiết cho user ${userId} (${cities.length} thành phố)`, "info");

        } catch (error) {
            throw new Error(`Lỗi khi gửi thời tiết cho user ${user.userId}: ${error.message}`);
        }
    }

    /**
     * Format tin nhắn thời tiết ngắn gọn
     * @param {Object} weather - Thông tin thời tiết
     * @returns {string} - Tin nhắn ngắn gọn
     */
    formatShortWeatherMessage(weather) {
        return `🌤️ **${weather.city}**: ${weather.temperature}°C, ${weather.description}`;
    }

    /**
     * Tạo tin nhắn tổng hợp thời tiết hàng ngày
     * @param {Array} weatherMessages - Danh sách tin nhắn thời tiết
     * @returns {string} - Tin nhắn tổng hợp
     */
    createDailyWeatherSummary(weatherMessages) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let message = `🌅 **BÁO CÁO THỜI TIẾT HÀNG NGÀY** 🌅\n`;
        message += `📅 ${dateStr}\n\n`;
        
        weatherMessages.forEach(msg => {
            message += `${msg}\n`;
        });

        message += `\n⏰ Cập nhật lúc: ${now.toLocaleTimeString('vi-VN')}`;
        message += `\n💡 Sử dụng /thoitiet để quản lý danh sách thành phố`;

        return message;
    }

    /**
     * Delay function
     * @param {number} ms - Milliseconds to delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Gửi thời tiết ngay lập tức cho test
     * @param {string} userId - ID của user để test
     */
    async sendTestWeather(userId) {
        try {
            const cities = weatherStorage.getUserCities(userId);
            
            if (cities.length === 0) {
                return { success: false, message: "User chưa có thành phố nào trong danh sách" };
            }

            const user = {
                userId: userId,
                cities: cities.filter(city => city.auto_notify !== false)
            };

            await this.sendWeatherToUser(user);
            return { success: true, message: `Đã gửi thời tiết test cho ${cities.length} thành phố` };

        } catch (error) {
            logger.log(`Lỗi khi gửi test weather: ${error.message}`, "error");
            return { success: false, message: error.message };
        }
    }

    /**
     * Lấy thông tin về các jobs đang chạy
     */
    getJobsInfo() {
        const info = [];
        for (const [name, job] of this.jobs.entries()) {
            info.push({
                name: name,
                nextInvocation: job.nextInvocation()
            });
        }
        return info;
    }

    /**
     * Hủy tất cả jobs
     */
    cancelAllJobs() {
        for (const [name, job] of this.jobs.entries()) {
            job.cancel();
            logger.log(`Đã hủy job: ${name}`, "info");
        }
        this.jobs.clear();
    }

    /**
     * Khởi động lại scheduler
     */
    restart() {
        this.cancelAllJobs();
        if (this.api) {
            this.setupDailyWeatherJob();
            this.setupCacheCleanupJob();
            logger.log("Weather scheduler đã được khởi động lại", "info");
        }
    }
}

module.exports = new WeatherScheduler();
