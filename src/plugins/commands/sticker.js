const { ThreadType } = require('zca-js');

module.exports.config = {
  name: "sticker",
  version: "1.0.0",
  role: 0,
  author: "Assistant",
  description: "Tìm kiếm và gửi sticker dựa trên từ khóa. Sử dụng 'sticker on/off' để bật/tắt",
  category: "Giải trí",
  usage: "sticker [on/off] [từ khóa]",
  cooldowns: 3
};

// Cấu hình
const CONFIG = {
  maxStickers: 5, // Số lượng sticker tối đa để chọn ngẫu nhiên
  timeout: 10000, // Timeout cho việc tìm kiếm sticker
};

// Hàm tìm kiếm sticker theo từ khóa
async function searchStickers(api, keyword) {
  try {
    console.log(`🔍 Đang tìm kiếm sticker với từ khóa: "${keyword}"`);
    
    // Tìm kiếm sticker IDs
    const stickerIds = await api.getStickers(keyword);
    
    if (!stickerIds || stickerIds.length === 0) {
      console.log(`❌ Không tìm thấy sticker nào cho từ khóa: "${keyword}"`);
      return { success: false, error: 'Không tìm thấy sticker nào' };
    }
    
    console.log(`✅ Tìm thấy ${stickerIds.length} sticker cho từ khóa: "${keyword}"`);
    
    // Lấy chi tiết sticker (chỉ lấy một số lượng giới hạn)
    const limitedIds = stickerIds.slice(0, CONFIG.maxStickers);
    const stickerDetails = await api.getStickersDetail(limitedIds);
    
    if (!stickerDetails || stickerDetails.length === 0) {
      console.log(`❌ Không thể lấy chi tiết sticker`);
      return { success: false, error: 'Không thể lấy chi tiết sticker' };
    }
    
    console.log(`✅ Lấy được chi tiết ${stickerDetails.length} sticker`);
    return { success: true, stickers: stickerDetails };
    
  } catch (error) {
    console.error(`❌ Lỗi khi tìm kiếm sticker: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm gửi sticker ngẫu nhiên
async function sendRandomSticker(api, event, stickers, keyword) {
  try {
    // Chọn ngẫu nhiên một sticker
    const randomSticker = stickers[Math.floor(Math.random() * stickers.length)];
    
    console.log(`🎭 Đang gửi sticker: ID=${randomSticker.id}, Text="${randomSticker.text}"`);
    
    // Gửi sticker
    const result = await api.sendSticker(randomSticker, event.threadId, event.type);
    
    if (result && result.msgId) {
      console.log(`✅ Đã gửi sticker thành công cho từ khóa: "${keyword}"`);
      return { success: true };
    } else {
      console.log(`❌ Không thể gửi sticker`);
      return { success: false, error: 'Không thể gửi sticker' };
    }
    
  } catch (error) {
    console.error(`❌ Lỗi khi gửi sticker: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports.run = async function({ api, event, args, Threads }) {
  const { threadId, type } = event;
  const senderID = event.data?.uidFrom || event.senderID;

  try {
    // Lấy dữ liệu nhóm
    const threadData = await Threads.getData(threadId);
    let groupData = threadData.data || {};

    // Xử lý lệnh on/off
    if (args[0] && (args[0].toLowerCase() === 'on' || args[0].toLowerCase() === 'off')) {
      const action = args[0].toLowerCase();

      // Kiểm tra quyền admin hoặc support
      const senderIDStr = String(senderID);
      const isBotAdmin = global.users?.admin?.includes(senderIDStr);
      const isSupport = global.users?.support?.includes(senderIDStr);

      if (!isBotAdmin && !isSupport) {
        return api.sendMessage({
          msg: '🚫 Chỉ admin hoặc support bot mới có thể bật/tắt chức năng sticker!',
          ttl: 30000
        }, threadId, type);
      }

      // Cập nhật trạng thái sticker
      groupData.sticker_enabled = (action === 'on');

      // Lưu vào database
      await Threads.setData(threadId, groupData);

      const statusText = action === 'on' ? 'bật' : 'tắt';
      return api.sendMessage({
        msg: `✅ Đã ${statusText} chức năng sticker cho nhóm này!`,
        ttl: 30000
      }, threadId, type);
    }

    // Kiểm tra xem chức năng có được bật không (mặc định là bật)
    if (groupData.sticker_enabled === false) {
      return api.sendMessage({
        msg: '❌ Chức năng sticker đang tắt!\n\n' +
             '💡 Sử dụng "sticker on" để bật chức năng\n' +
             '💡 Sử dụng "sticker off" để tắt chức năng',
        ttl: 30000
      }, threadId, type);
    }

    // Kiểm tra từ khóa
    if (!args[0]) {
      return api.sendMessage({
        msg: '❌ Vui lòng nhập từ khóa để tìm sticker!\n\n' +
             '💡 Ví dụ: sticker happy\n' +
             '💡 Ví dụ: sticker love\n' +
             '💡 Ví dụ: sticker sad',
        ttl: 30000
      }, threadId, type);
    }

    const keyword = args.join(' ').trim();

    // Gửi tin nhắn đang tìm kiếm
    const searchingMsg = await api.sendMessage({
      msg: `🔍 Đang tìm kiếm sticker cho từ khóa: "${keyword}"...`,
      ttl: 10000
    }, threadId, type);

    // Tìm kiếm sticker
    const searchResult = await Promise.race([
      searchStickers(api, keyword),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), CONFIG.timeout)
      )
    ]);

    if (!searchResult.success) {
      return api.sendMessage({
        msg: `❌ ${searchResult.error}\n\n💡 Thử với từ khóa khác hoặc từ khóa tiếng Anh`,
        ttl: 20000
      }, threadId, type);
    }

    // Gửi sticker ngẫu nhiên
    const sendResult = await sendRandomSticker(api, event, searchResult.stickers, keyword);

    if (!sendResult.success) {
      return api.sendMessage({
        msg: `❌ Không thể gửi sticker: ${sendResult.error}`,
        ttl: 20000
      }, threadId, type);
    }

    // Thành công - không cần gửi thêm tin nhắn vì sticker đã được gửi

  } catch (error) {
    console.error('❌ Lỗi trong lệnh sticker:', error);
    
    if (error.message === 'Timeout') {
      return api.sendMessage({
        msg: '⏰ Tìm kiếm sticker quá lâu, vui lòng thử lại!',
        ttl: 20000
      }, threadId, type);
    }
    
    return api.sendMessage({
      msg: '❌ Đã xảy ra lỗi khi tìm kiếm sticker!',
      ttl: 20000
    }, threadId, type);
  }
};
