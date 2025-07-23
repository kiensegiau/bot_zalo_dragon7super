const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
  name: "dú",
  version: "1.0.0",
  role: 0,
  author: "Assistant",
  description: "Gửi ảnh ngẫu nhiên từ thư mục dú. Sử dụng 'dú on/off' để bật/tắt",
  category: "Giải trí",
  usage: "dú [on/off] [anime/cosplay/girl/girlsexy/girlv1]",
  cooldowns: 3
};

// Đường dẫn đến thư mục chứa các file txt
const duPath = path.join(__dirname, '../../../assets/images');

// Danh sách các loại ảnh có sẵn
const imageTypes = ['anime', 'cosplay', 'girl', 'girlsexy', 'girlv1'];

// Hàm đọc link ảnh từ file txt
function getImageLinks(type) {
  const filePath = path.join(duPath, `${type}.txt`);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return content.split('\n').filter(line => line.trim() && line.startsWith('http'));
}

// Hàm lấy ảnh ngẫu nhiên
function getRandomImage(type = null) {
  let selectedType = type;
  
  // Nếu không chỉ định loại, chọn ngẫu nhiên
  if (!selectedType || !imageTypes.includes(selectedType)) {
    selectedType = imageTypes[Math.floor(Math.random() * imageTypes.length)];
  }
  
  const links = getImageLinks(selectedType);
  if (links.length === 0) {
    return null;
  }
  
  const randomLink = links[Math.floor(Math.random() * links.length)];
  return { link: randomLink, type: selectedType };
}

// Hàm tải ảnh và tạo file tạm
async function downloadImage(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    });
    
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const fileName = `du_${Date.now()}.jpg`;
    const filePath = path.join(tempDir, fileName);
    
    fs.writeFileSync(filePath, response.data);
    return filePath;
  } catch (error) {
    console.error('Lỗi khi tải ảnh:', error.message);
    return null;
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

      // Kiểm tra quyền admin hoặc support (convert to string để đảm bảo match)
      const senderIDStr = String(senderID);
      const isBotAdmin = global.users?.admin?.includes(senderIDStr);
      const isSupport = global.users?.support?.includes(senderIDStr);

      // Debug log
      console.log('Debug du.js:', {
        senderID,
        senderIDStr,
        adminList: global.users?.admin,
        supportList: global.users?.support,
        isBotAdmin,
        isSupport
      });

      if (!isBotAdmin && !isSupport) {
        return api.sendMessage({
          msg: '🚫 Chỉ admin hoặc support bot mới có thể bật/tắt chức năng dú!',
          ttl: 30000  // Tự xóa sau 30 giây
        }, threadId, type);
      }

      // Cập nhật trạng thái dú
      groupData.du_enabled = (action === 'on');

      // Lưu vào database
      await Threads.setData(threadId, groupData);

      const statusText = action === 'on' ? 'bật' : 'tắt';
      return api.sendMessage({
        msg: `✅ Đã ${statusText} chức năng dú cho nhóm này!`,
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }
    
    // Kiểm tra xem chức năng có được bật không (mặc định là tắt)
    if (groupData.du_enabled !== true) {
      return api.sendMessage({
        msg: '❌ Chức năng dú đang tắt!\n\n' +
             '💡 Sử dụng "dú on" để bật chức năng\n' +
             '💡 Sử dụng "dú off" để tắt chức năng',
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }
    
    // Lấy loại ảnh từ args (nếu có)
    const requestedType = args[0] ? args[0].toLowerCase() : null;
    
    // Kiểm tra loại ảnh có hợp lệ không
    if (requestedType && !imageTypes.includes(requestedType)) {
      return api.sendMessage({
        msg: `❌ Loại ảnh không hợp lệ!\n\n` +
             `📋 Các loại có sẵn: ${imageTypes.join(', ')}\n` +
             `💡 Sử dụng: dú [${imageTypes.join('|')}]`,
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }
    
    // Lấy ảnh ngẫu nhiên
    const imageData = getRandomImage(requestedType);
    if (!imageData) {
      return api.sendMessage({
        msg: '❌ Không tìm thấy ảnh nào!',
        ttl: 20000  // Tự xóa sau 20 giây
      }, threadId, type);
    }

    // Tải ảnh
    const imagePath = await downloadImage(imageData.link);
    if (!imagePath) {
      return api.sendMessage({
        msg: '❌ Không thể tải ảnh. Vui lòng thử lại!',
        ttl: 20000  // Tự xóa sau 20 giây
      }, threadId, type);
    }
    
    // Gửi ảnh với TTL tự xóa sau 60 giây (60000ms) - chỉ ảnh không có text
    await api.sendMessage({
      msg: "",
      attachments: [imagePath],
      ttl: 60000  // Tin nhắn tự xóa sau 60 giây
    }, threadId, type);
    
    // Xóa file tạm sau khi gửi
    setTimeout(() => {
      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } catch (error) {
        console.error('Lỗi khi xóa file tạm:', error.message);
      }
    }, 5000);
    
  } catch (error) {
    console.error('Lỗi trong command dú:', error);
    api.sendMessage({
      msg: '❌ Có lỗi xảy ra khi xử lý lệnh!',
      ttl: 20000  // Tự xóa sau 20 giây
    }, threadId, type);
  }
};
