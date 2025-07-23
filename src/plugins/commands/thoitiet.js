const weatherAPI = require('../../utils/weather/api');
const weatherStorage = require('../../utils/weather/storage');

module.exports.config = {
    name: "thoitiet",
    version: "1.0.0",
    role: 0,
    author: "Dragon7 Bot Team",
    description: "Quản lý và xem thông tin thời tiết các thành phố",
    category: "Tiện ích",
    usage: "thoitiet [them|xoa|list|xem|caidat] [tên thành phố/số thứ tự]",
    cooldowns: 3,
    dependencies: {}
};

module.exports.run = async ({ args, event, api, Users }) => {
    const { threadId, type } = event;
    const userId = event.data.uidFrom;

    // Kiểm tra API key
    if (!global.config.weather_api || !global.config.weather_api.api_key || global.config.weather_api.api_key === "YOUR_API_KEY_HERE") {
        return api.sendMessage({
            msg: "⚠️ Chức năng thời tiết chưa được cấu hình!\n\n" +
            "Admin cần:\n" +
            "1. Đăng ký API key tại: https://openweathermap.org/api\n" +
            "2. Cập nhật config.yml với API key\n" +
            "3. Đợi vài phút để API key được kích hoạt",
            ttl: 60000  // Tự xóa sau 60 giây
        }, threadId, type);
    }

    const action = args[0]?.toLowerCase();

    try {
        switch (action) {
            case 'them':
            case 'add':
                await handleAddCity(args.slice(1).join(' '), userId, api, threadId, type);
                break;
            
            case 'xoa':
            case 'remove':
            case 'delete':
                await handleRemoveCity(args[1], userId, api, threadId, type);
                break;
            
            case 'list':
            case 'danh-sach':
            case 'ds':
                await handleListCities(userId, api, threadId, type);
                break;
            
            case 'xem':
            case 'view':
            case 'check':
                await handleViewWeather(args.slice(1).join(' '), userId, api, threadId, type);
                break;
            
            case 'caidat':
            case 'settings':
            case 'config':
                await handleSettings(args.slice(1), userId, api, threadId, type);
                break;
            
            default:
                await showMainMenu(api, threadId, type);
                break;
        }
    } catch (error) {
        console.error('Lỗi trong command thoitiet:', error);
        api.sendMessage({
            msg: "❌ Có lỗi xảy ra khi xử lý yêu cầu!",
            ttl: 30000  // Tự xóa sau 30 giây
        }, threadId, type);
    }
};

/**
 * Hiển thị menu chính
 */
async function showMainMenu(api, threadId, type) {
    const menu = `🌤️ **TRUNG TÂM THỜI TIẾT BOT** 🌤️\n\n` +
                 `🎯 **MENU CHÍNH:**\n\n` +
                 `1️⃣ **Thêm thành phố**\n` +
                 `   📝 /thoitiet them <tên thành phố>\n` +
                 `   💡 VD: /thoitiet them Ha Noi\n\n` +
                 `2️⃣ **Xem thời tiết**\n` +
                 `   🌤️ /thoitiet xem [tên/số thứ tự]\n` +
                 `   💡 VD: /thoitiet xem 1\n\n` +
                 `3️⃣ **Quản lý danh sách**\n` +
                 `   📋 /thoitiet list - Xem danh sách\n` +
                 `   ❌ /thoitiet xoa <số> - Xóa thành phố\n\n` +
                 `4️⃣ **Cài đặt thông báo**\n` +
                 `   ⚙️ /thoitiet caidat - Quản lý thông báo 6h sáng\n\n` +
                 `🔥 **TÍNH NĂNG NỔI BẬT:**\n` +
                 `• 🔔 Thông báo tự động 6h sáng hàng ngày\n` +
                 `• 📊 Theo dõi tối đa 10 thành phố\n` +
                 `• 🌍 Hỗ trợ thành phố trên toàn thế giới\n` +
                 `• ⚡ Dữ liệu thời tiết cập nhật realtime\n\n` +
                 `❓ Cần hỗ trợ? Gõ /thoitiet để xem menu này!`;

    return api.sendMessage({
        msg: menu,
        ttl: 120000  // Tự xóa sau 2 phút (menu dài)
    }, threadId, type);
}

/**
 * Xử lý thêm thành phố
 */
async function handleAddCity(cityName, userId, api, threadId, type) {
    if (!cityName || cityName.trim() === '') {
        return api.sendMessage({
            msg: "❌ Vui lòng nhập tên thành phố!\n\n" +
            "Ví dụ: /thoitiet them Ha Noi",
            ttl: 30000  // Tự xóa sau 30 giây
        }, threadId, type);
    }

    try {
        api.sendMessage({
            msg: "🔍 Đang tìm kiếm thành phố...",
            ttl: 20000  // Tự xóa sau 20 giây
        }, threadId, type);

        const cities = await weatherAPI.searchCity(cityName.trim());
        
        if (cities.length === 0) {
            return api.sendMessage(
                `❌ Không tìm thấy thành phố "${cityName}"!\n\n` +
                "Vui lòng kiểm tra lại tên thành phố.",
                threadId, type
            );
        }

        // Nếu chỉ có 1 kết quả, thêm luôn
        if (cities.length === 1) {
            const result = await weatherStorage.addUserCity(userId, cities[0]);
            return api.sendMessage(
                result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
                threadId, type
            );
        }

        // Nếu có nhiều kết quả, hiển thị để user chọn
        let message = `🔍 Tìm thấy ${cities.length} kết quả cho "${cityName}":\n\n`;
        cities.forEach((city, index) => {
            message += `${index + 1}. ${city.display_name}\n`;
        });
        message += `\nReply số thứ tự để chọn thành phố (1-${cities.length})`;

        // Lưu tạm danh sách cities để xử lý sau
        // TODO: Implement reply handler
        return api.sendMessage(message, threadId, type);

    } catch (error) {
        console.error('Lỗi khi thêm thành phố:', error);

        let errorMessage = "❌ Có lỗi xảy ra khi tìm kiếm thành phố!\n";

        if (error.response && error.response.status === 401) {
            errorMessage += "\n🔑 **Lỗi API Key:**\n" +
                           "• API key không hợp lệ hoặc chưa được kích hoạt\n" +
                           "• OpenWeatherMap cần 10 phút - 2 giờ để kích hoạt API key mới\n" +
                           "• Kiểm tra email để xác thực tài khoản\n\n" +
                           "💡 **Hướng dẫn:**\n" +
                           "1. Đăng nhập https://openweathermap.org\n" +
                           "2. Vào My API Keys để kiểm tra trạng thái\n" +
                           "3. Đợi API key được kích hoạt";
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('network')) {
            errorMessage += "\n🌐 **Lỗi kết nối:**\n" +
                           "• Kiểm tra kết nối internet\n" +
                           "• Thử lại sau vài phút";
        } else {
            errorMessage += "\nVui lòng thử lại sau hoặc liên hệ admin.";
        }

        return api.sendMessage(errorMessage, threadId, type);
    }
}

/**
 * Xử lý xóa thành phố
 */
async function handleRemoveCity(cityIndex, userId, api, threadId, type) {
    if (!cityIndex || isNaN(cityIndex)) {
        return api.sendMessage(
            "❌ Vui lòng nhập số thứ tự thành phố cần xóa!\n\n" +
            "Sử dụng /thoitiet list để xem danh sách",
            threadId, type
        );
    }

    const index = parseInt(cityIndex) - 1; // Convert to 0-based index
    const result = await weatherStorage.removeUserCity(userId, index);
    
    return api.sendMessage(
        result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        threadId, type
    );
}

/**
 * Xử lý xem danh sách thành phố
 */
async function handleListCities(userId, api, threadId, type) {
    const cities = weatherStorage.getUserCities(userId);
    const message = weatherStorage.formatCitiesList(cities);
    return api.sendMessage(message, threadId, type);
}

/**
 * Xử lý xem thời tiết
 */
async function handleViewWeather(input, userId, api, threadId, type) {
    try {
        const cities = weatherStorage.getUserCities(userId);

        // Nếu không có input, hiển thị menu chọn
        if (!input || input.trim() === '') {
            if (cities.length === 0) {
                return api.sendMessage(
                    "📍 Bạn chưa có thành phố nào trong danh sách!\n\n" +
                    "Sử dụng /thoitiet them <tên thành phố> để thêm thành phố.",
                    threadId, type
                );
            }

            let message = "🌤️ Chọn thành phố để xem thời tiết:\n\n";
            cities.forEach((city, index) => {
                message += `${index + 1}. ${city.display_name}\n`;
            });
            message += "\nReply số thứ tự hoặc dùng: /thoitiet xem <số>";

            return api.sendMessage(message, threadId, type);
        }

        let targetCity = null;

        // Kiểm tra xem input có phải là số thứ tự không
        if (!isNaN(input.trim())) {
            const index = parseInt(input.trim()) - 1;
            if (index >= 0 && index < cities.length) {
                targetCity = cities[index];
            } else {
                return api.sendMessage(
                    `❌ Số thứ tự không hợp lệ! (1-${cities.length})`,
                    threadId, type
                );
            }
        } else {
            // Tìm kiếm thành phố mới
            api.sendMessage("🔍 Đang tìm kiếm thông tin thời tiết...", threadId, type);
            const searchResults = await weatherAPI.searchCity(input.trim());
            
            if (searchResults.length === 0) {
                return api.sendMessage(
                    `❌ Không tìm thấy thành phố "${input}"!`,
                    threadId, type
                );
            }
            
            targetCity = searchResults[0];
        }

        // Lấy thông tin thời tiết
        api.sendMessage("🌤️ Đang lấy thông tin thời tiết...", threadId, type);
        const weather = await weatherAPI.getCurrentWeather(targetCity.lat, targetCity.lon);
        const weatherMessage = weatherAPI.formatWeatherMessage(weather);

        return api.sendMessage(weatherMessage, threadId, type);

    } catch (error) {
        console.error('Lỗi khi xem thời tiết:', error);

        let errorMessage = "❌ Có lỗi xảy ra khi lấy thông tin thời tiết!\n";

        if (error.response && error.response.status === 401) {
            errorMessage += "\n🔑 API key chưa được kích hoạt. Vui lòng đợi thêm và thử lại.";
        } else if (error.message.includes('ENOTFOUND')) {
            errorMessage += "\n🌐 Lỗi kết nối internet. Vui lòng thử lại.";
        } else {
            errorMessage += "\nVui lòng thử lại sau.";
        }

        return api.sendMessage(errorMessage, threadId, type);
    }
}

/**
 * Xử lý cài đặt
 */
async function handleSettings(args, userId, api, threadId, type) {
    const settings = await weatherStorage.getUserWeatherSettings(userId);
    
    if (!args || args.length === 0) {
        const statusText = settings.auto_notify_enabled ? "🔔 Bật" : "🔕 Tắt";
        const message = `⚙️ **CÀI ĐẶT THỜI TIẾT** ⚙️\n\n` +
                       `🔔 Thông báo tự động: ${statusText}\n` +
                       `⏰ Thời gian thông báo: ${settings.notify_time}\n\n` +
                       `📝 Các lệnh cài đặt:\n` +
                       `/thoitiet caidat on - Bật thông báo\n` +
                       `/thoitiet caidat off - Tắt thông báo\n` +
                       `/thoitiet caidat time HH:MM - Đặt giờ thông báo`;

        return api.sendMessage(message, threadId, type);
    }

    const action = args[0]?.toLowerCase();
    
    switch (action) {
        case 'on':
        case 'bat':
            const enableResult = await weatherStorage.updateUserWeatherSettings(userId, {
                auto_notify_enabled: true
            });
            return api.sendMessage(
                enableResult.success ? "✅ Đã bật thông báo thời tiết tự động!" : "❌ Có lỗi xảy ra!",
                threadId, type
            );
        
        case 'off':
        case 'tat':
            const disableResult = await weatherStorage.updateUserWeatherSettings(userId, {
                auto_notify_enabled: false
            });
            return api.sendMessage(
                disableResult.success ? "✅ Đã tắt thông báo thời tiết tự động!" : "❌ Có lỗi xảy ra!",
                threadId, type
            );
        
        case 'time':
        case 'gio':
            const timeValue = args[1];
            if (!timeValue || !/^\d{2}:\d{2}$/.test(timeValue)) {
                return api.sendMessage(
                    "❌ Định dạng thời gian không hợp lệ!\n\n" +
                    "Ví dụ: /thoitiet caidat time 06:00",
                    threadId, type
                );
            }
            
            const timeResult = await weatherStorage.updateUserWeatherSettings(userId, {
                notify_time: timeValue
            });
            return api.sendMessage(
                timeResult.success ? `✅ Đã đặt thời gian thông báo: ${timeValue}` : "❌ Có lỗi xảy ra!",
                threadId, type
            );
        
        default:
            return api.sendMessage(
                "❌ Lệnh cài đặt không hợp lệ!\n\n" +
                "Sử dụng: /thoitiet caidat để xem hướng dẫn",
                threadId, type
            );
    }
}
