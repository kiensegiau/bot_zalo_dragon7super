const axios = require('axios');
const logger = require('../logger');

class WeatherAPI {
    constructor() {
        this.config = null;
        this.cache = new Map();
        this.baseURL = 'https://api.openweathermap.org/data/2.5';
        this.geocodingURL = 'https://api.openweathermap.org/geo/1.0';
    }

    /**
     * Khởi tạo config sau khi global.config đã sẵn sàng
     */
    init() {
        this.config = global.config?.weather_api;
        if (!this.config) {
            logger.log('Weather API config not found in global.config', 'warn');
        }
    }

    /**
     * Lấy config, khởi tạo nếu chưa có
     */
    getConfig() {
        if (!this.config) {
            this.init();
        }
        return this.config;
    }

    /**
     * Tìm kiếm tọa độ của thành phố
     * @param {string} cityName - Tên thành phố
     * @returns {Promise<Object>} - Thông tin tọa độ và tên thành phố
     */
    async searchCity(cityName) {
        try {
            const config = this.getConfig();
            if (!config || !config.api_key) {
                throw new Error('Weather API chưa được cấu hình');
            }

            const cacheKey = `geo_${cityName.toLowerCase()}`;

            // Kiểm tra cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < config.cache_duration * 1000) {
                    return cached.data;
                }
            }

            const url = `${this.geocodingURL}/direct`;
            const params = {
                q: cityName,
                limit: 5,
                appid: config.api_key
            };

            const response = await axios.get(url, { params });
            
            if (!response.data || response.data.length === 0) {
                throw new Error(`Không tìm thấy thành phố "${cityName}"`);
            }

            const cities = response.data.map(city => ({
                name: city.name,
                country: city.country,
                state: city.state || '',
                lat: city.lat,
                lon: city.lon,
                display_name: `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`
            }));

            // Lưu vào cache
            this.cache.set(cacheKey, {
                data: cities,
                timestamp: Date.now()
            });

            return cities;
        } catch (error) {
            logger.log(`Lỗi khi tìm kiếm thành phố "${cityName}": ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Lấy thông tin thời tiết hiện tại
     * @param {number} lat - Vĩ độ
     * @param {number} lon - Kinh độ
     * @returns {Promise<Object>} - Thông tin thời tiết
     */
    async getCurrentWeather(lat, lon) {
        try {
            const config = this.getConfig();
            if (!config || !config.api_key) {
                throw new Error('Weather API chưa được cấu hình');
            }

            const cacheKey = `weather_${lat}_${lon}`;

            // Kiểm tra cache
            if (this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < config.cache_duration * 1000) {
                    return cached.data;
                }
            }

            const url = `${this.baseURL}/weather`;
            const params = {
                lat: lat,
                lon: lon,
                appid: config.api_key,
                units: config.units,
                lang: config.default_lang
            };

            const response = await axios.get(url, { params });
            const data = response.data;

            const weatherInfo = {
                city: data.name,
                country: data.sys.country,
                temperature: Math.round(data.main.temp),
                feels_like: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                pressure: data.main.pressure,
                description: data.weather[0].description,
                icon: data.weather[0].icon,
                wind_speed: data.wind.speed,
                wind_deg: data.wind.deg,
                visibility: data.visibility / 1000, // Convert to km
                sunrise: new Date(data.sys.sunrise * 1000),
                sunset: new Date(data.sys.sunset * 1000),
                timestamp: new Date()
            };

            // Lưu vào cache
            this.cache.set(cacheKey, {
                data: weatherInfo,
                timestamp: Date.now()
            });

            return weatherInfo;
        } catch (error) {
            logger.log(`Lỗi khi lấy thông tin thời tiết: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Format thông tin thời tiết thành tin nhắn đẹp
     * @param {Object} weather - Thông tin thời tiết
     * @returns {string} - Tin nhắn đã format
     */
    formatWeatherMessage(weather) {
        const windDirection = this.getWindDirection(weather.wind_deg);
        const timeFormat = {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh'
        };

        // Chọn emoji phù hợp với nhiệt độ
        const tempEmoji = weather.temperature >= 30 ? '🔥' :
                         weather.temperature >= 25 ? '☀️' :
                         weather.temperature >= 20 ? '🌤️' :
                         weather.temperature >= 15 ? '⛅' : '❄️';

        // Chọn emoji cho độ ẩm
        const humidityEmoji = weather.humidity >= 80 ? '💧💧💧' :
                             weather.humidity >= 60 ? '💧💧' : '💧';

        return `${tempEmoji} **THỜI TIẾT ${weather.city.toUpperCase()}** ${tempEmoji}\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `🌡️ **Nhiệt độ:** ${weather.temperature}°C\n` +
               `🤗 **Cảm giác như:** ${weather.feels_like}°C\n` +
               `☁️ **Tình trạng:** ${weather.description}\n` +
               `${humidityEmoji} **Độ ẩm:** ${weather.humidity}%\n` +
               `🌪️ **Gió:** ${weather.wind_speed} m/s hướng ${windDirection}\n` +
               `👁️ **Tầm nhìn:** ${weather.visibility} km\n` +
               `🌅 **Mặt trời mọc:** ${weather.sunrise.toLocaleTimeString('vi-VN', timeFormat)}\n` +
               `🌇 **Mặt trời lặn:** ${weather.sunset.toLocaleTimeString('vi-VN', timeFormat)}\n\n` +
               `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `⏰ Cập nhật: ${weather.timestamp.toLocaleString('vi-VN')}\n` +
               `📡 Nguồn: OpenWeatherMap`;
    }

    /**
     * Chuyển đổi độ gió thành hướng
     * @param {number} deg - Độ gió
     * @returns {string} - Hướng gió
     */
    getWindDirection(deg) {
        const directions = [
            'Bắc', 'Đông Bắc', 'Đông', 'Đông Nam',
            'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'
        ];
        return directions[Math.round(deg / 45) % 8];
    }

    /**
     * Kiểm tra API key có hợp lệ không
     * @returns {Promise<boolean>}
     */
    async validateApiKey() {
        try {
            await this.getCurrentWeather(21.0285, 105.8542); // Hà Nội
            return true;
        } catch (error) {
            if (error.response && error.response.status === 401) {
                return false;
            }
            return true; // Có thể là lỗi khác, không phải API key
        }
    }

    /**
     * Xóa cache cũ
     */
    clearOldCache() {
        const config = this.getConfig();
        if (!config) return;

        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > config.cache_duration * 1000) {
                this.cache.delete(key);
            }
        }
    }
}

module.exports = new WeatherAPI();
