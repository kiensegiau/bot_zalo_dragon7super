const Users = require('../../core/controllers/users');
const logger = require('../logger');

class WeatherStorage {
    /**
     * Lấy danh sách thành phố của user
     * @param {string} userId - ID của user
     * @returns {Array} - Danh sách thành phố
     */
    getUserCities(userId) {
        try {
            const userData = Users.getData(userId);
            return userData.data.weather_cities || [];
        } catch (error) {
            logger.log(`Lỗi khi lấy danh sách thành phố của user ${userId}: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Thêm thành phố vào danh sách của user
     * @param {string} userId - ID của user
     * @param {Object} cityData - Thông tin thành phố
     * @returns {Promise<boolean>} - Thành công hay không
     */
    async addUserCity(userId, cityData) {
        try {
            const userData = await Users.getData(userId);
            const currentData = userData.data;

            // Khởi tạo mảng nếu chưa có
            if (!currentData.weather_cities) {
                currentData.weather_cities = [];
            }

            // Kiểm tra xem thành phố đã tồn tại chưa
            const existingCity = currentData.weather_cities.find(city => 
                city.lat === cityData.lat && city.lon === cityData.lon
            );

            if (existingCity) {
                return { success: false, message: 'Thành phố này đã có trong danh sách!' };
            }

            // Giới hạn số lượng thành phố (tối đa 10)
            if (currentData.weather_cities.length >= 10) {
                return { success: false, message: 'Bạn chỉ có thể theo dõi tối đa 10 thành phố!' };
            }

            // Thêm thành phố mới
            const newCity = {
                name: cityData.name,
                display_name: cityData.display_name,
                country: cityData.country,
                state: cityData.state || '',
                lat: cityData.lat,
                lon: cityData.lon,
                auto_notify: true, // Mặc định bật thông báo
                added_date: new Date().toISOString()
            };

            currentData.weather_cities.push(newCity);

            // Khởi tạo cài đặt thời tiết nếu chưa có
            if (!currentData.weather_settings) {
                currentData.weather_settings = {
                    auto_notify_enabled: true,
                    notify_time: '06:00'
                };
            }

            await Users.setData(userId, currentData);
            logger.log(`User ${userId} đã thêm thành phố: ${cityData.display_name}`, 'info');
            
            return { success: true, message: `Đã thêm ${cityData.display_name} vào danh sách theo dõi!` };
        } catch (error) {
            logger.log(`Lỗi khi thêm thành phố cho user ${userId}: ${error.message}`, 'error');
            return { success: false, message: 'Có lỗi xảy ra khi thêm thành phố!' };
        }
    }

    /**
     * Xóa thành phố khỏi danh sách của user
     * @param {string} userId - ID của user
     * @param {number} cityIndex - Index của thành phố trong danh sách
     * @returns {Promise<Object>} - Kết quả xóa
     */
    async removeUserCity(userId, cityIndex) {
        try {
            const userData = await Users.getData(userId);
            const currentData = userData.data;

            if (!currentData.weather_cities || currentData.weather_cities.length === 0) {
                return { success: false, message: 'Bạn chưa có thành phố nào trong danh sách!' };
            }

            if (cityIndex < 0 || cityIndex >= currentData.weather_cities.length) {
                return { success: false, message: 'Số thứ tự thành phố không hợp lệ!' };
            }

            const removedCity = currentData.weather_cities[cityIndex];
            currentData.weather_cities.splice(cityIndex, 1);

            await Users.setData(userId, currentData);
            logger.log(`User ${userId} đã xóa thành phố: ${removedCity.display_name}`, 'info');
            
            return { 
                success: true, 
                message: `Đã xóa ${removedCity.display_name} khỏi danh sách theo dõi!`,
                removedCity: removedCity
            };
        } catch (error) {
            logger.log(`Lỗi khi xóa thành phố cho user ${userId}: ${error.message}`, 'error');
            return { success: false, message: 'Có lỗi xảy ra khi xóa thành phố!' };
        }
    }

    /**
     * Cập nhật cài đặt thời tiết của user
     * @param {string} userId - ID của user
     * @param {Object} settings - Cài đặt mới
     * @returns {Promise<boolean>} - Thành công hay không
     */
    async updateUserWeatherSettings(userId, settings) {
        try {
            const userData = await Users.getData(userId);
            const currentData = userData.data;

            if (!currentData.weather_settings) {
                currentData.weather_settings = {
                    auto_notify_enabled: true,
                    notify_time: '06:00'
                };
            }

            // Cập nhật cài đặt
            Object.assign(currentData.weather_settings, settings);

            await Users.setData(userId, currentData);
            logger.log(`User ${userId} đã cập nhật cài đặt thời tiết`, 'info');
            
            return { success: true, message: 'Đã cập nhật cài đặt thành công!' };
        } catch (error) {
            logger.log(`Lỗi khi cập nhật cài đặt cho user ${userId}: ${error.message}`, 'error');
            return { success: false, message: 'Có lỗi xảy ra khi cập nhật cài đặt!' };
        }
    }

    /**
     * Lấy cài đặt thời tiết của user
     * @param {string} userId - ID của user
     * @returns {Object} - Cài đặt thời tiết
     */
    getUserWeatherSettings(userId) {
        try {
            const userData = Users.getData(userId);
            return userData.data.weather_settings || {
                auto_notify_enabled: true,
                notify_time: '06:00'
            };
        } catch (error) {
            logger.log(`Lỗi khi lấy cài đặt thời tiết của user ${userId}: ${error.message}`, 'error');
            return {
                auto_notify_enabled: true,
                notify_time: '06:00'
            };
        }
    }

    /**
     * Lấy tất cả users có bật thông báo tự động
     * @returns {Array} - Danh sách users và thành phố của họ
     */
    getAllUsersWithAutoNotify() {
        try {
            const allUsers = Users.getAll();
            const usersWithNotify = [];

            for (const user of allUsers) {
                const userData = user.data;
                if (userData.weather_cities &&
                    userData.weather_cities.length > 0 &&
                    userData.weather_settings &&
                    userData.weather_settings.auto_notify_enabled) {

                    usersWithNotify.push({
                        userId: user.userId,
                        cities: userData.weather_cities.filter(city => city.auto_notify),
                        settings: userData.weather_settings
                    });
                }
            }

            return usersWithNotify;
        } catch (error) {
            logger.log(`Lỗi khi lấy danh sách users có thông báo tự động: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Format danh sách thành phố thành tin nhắn
     * @param {Array} cities - Danh sách thành phố
     * @returns {string} - Tin nhắn đã format
     */
    formatCitiesList(cities) {
        if (!cities || cities.length === 0) {
            return '📍 Bạn chưa có thành phố nào trong danh sách theo dõi.\n\nSử dụng lệnh /thoitiet để thêm thành phố!';
        }

        let message = '📍 **DANH SÁCH THÀNH PHỐ THEO DÕI** 📍\n\n';
        
        cities.forEach((city, index) => {
            const notifyStatus = city.auto_notify ? '🔔' : '🔕';
            message += `${index + 1}. ${notifyStatus} ${city.display_name}\n`;
        });

        message += `\n📊 Tổng: ${cities.length}/10 thành phố`;
        message += '\n\n💡 Sử dụng /thoitiet để quản lý danh sách!';

        return message;
    }
}

module.exports = new WeatherStorage();
