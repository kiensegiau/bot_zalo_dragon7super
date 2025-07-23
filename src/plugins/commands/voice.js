const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ThreadType } = require('zca-js');

module.exports.config = {
  name: "voice",
  version: "1.0.0",
  role: 0,
  author: "Assistant",
  description: "Gửi tin nhắn voice từ URL hoặc file local. Sử dụng 'voice on/off' để bật/tắt",
  category: "Giải trí",
  usage: "voice [on/off] [URL] hoặc voice [tên file]",
  cooldowns: 5
};

// Cấu hình
const CONFIG = {
  timeout: 15000, // Timeout cho việc tải voice
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['.mp3', '.m4a', '.wav', '.ogg', '.aac'],
  voiceFolder: path.join(__dirname, '../../../assets/voices'), // Thư mục chứa file voice
};

// Tạo thư mục voice nếu chưa có
if (!fs.existsSync(CONFIG.voiceFolder)) {
  fs.mkdirSync(CONFIG.voiceFolder, { recursive: true });
}

// Hàm kiểm tra URL voice có hợp lệ không
async function checkVoiceUrl(url) {
  try {
    const response = await axios.head(url, {
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const contentType = response.headers['content-type'] || '';
    const contentLength = parseInt(response.headers['content-length'] || '0');
    
    // Kiểm tra content type
    const isAudio = contentType.includes('audio/') || 
                   contentType.includes('application/octet-stream');
    
    // Kiểm tra kích thước file
    const isValidSize = contentLength > 0 && contentLength <= CONFIG.maxFileSize;
    
    return {
      isValid: isAudio && isValidSize,
      contentType,
      fileSize: contentLength,
      error: !isAudio ? 'Không phải file audio' : 
             !isValidSize ? 'File quá lớn (>10MB)' : null
    };
    
  } catch (error) {
    return {
      isValid: false,
      error: error.message
    };
  }
}

// Hàm gửi voice từ URL
async function sendVoiceFromUrl(api, event, voiceUrl) {
  try {
    console.log(`🎵 Đang gửi voice từ URL: ${voiceUrl}`);
    
    // Kiểm tra URL
    const urlCheck = await checkVoiceUrl(voiceUrl);
    if (!urlCheck.isValid) {
      return { success: false, error: urlCheck.error };
    }
    
    // Gửi voice sử dụng ZCA-JS API
    const result = await api.sendVoice({
      voiceUrl: voiceUrl,
      ttl: 300000 // 5 phút
    }, event.threadId, event.type);
    
    if (result && result.msgId) {
      console.log(`✅ Đã gửi voice thành công từ URL`);
      return { success: true };
    } else {
      return { success: false, error: 'Không thể gửi voice' };
    }
    
  } catch (error) {
    console.error(`❌ Lỗi khi gửi voice từ URL: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm gửi voice từ file local
async function sendVoiceFromFile(api, event, fileName) {
  try {
    const filePath = path.join(CONFIG.voiceFolder, fileName);
    
    // Kiểm tra file có tồn tại không
    if (!fs.existsSync(filePath)) {
      return { success: false, error: 'File không tồn tại' };
    }
    
    // Kiểm tra định dạng file
    const fileExt = path.extname(fileName).toLowerCase();
    if (!CONFIG.supportedFormats.includes(fileExt)) {
      return { success: false, error: `Định dạng không hỗ trợ. Hỗ trợ: ${CONFIG.supportedFormats.join(', ')}` };
    }
    
    // Kiểm tra kích thước file
    const stats = fs.statSync(filePath);
    if (stats.size > CONFIG.maxFileSize) {
      return { success: false, error: 'File quá lớn (>10MB)' };
    }
    
    console.log(`🎵 Đang gửi voice từ file: ${fileName}`);
    
    // Tạo URL tạm thời cho file local (cần server để serve file)
    // Hoặc upload file lên service và lấy URL
    // Tạm thời return error vì cần implement upload service
    return { 
      success: false, 
      error: 'Tính năng gửi file local chưa được hỗ trợ. Vui lòng sử dụng URL' 
    };
    
  } catch (error) {
    console.error(`❌ Lỗi khi gửi voice từ file: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm liệt kê file voice có sẵn
function listVoiceFiles() {
  try {
    const files = fs.readdirSync(CONFIG.voiceFolder)
      .filter(file => CONFIG.supportedFormats.includes(path.extname(file).toLowerCase()))
      .slice(0, 10); // Giới hạn 10 file
    
    return files;
  } catch (error) {
    return [];
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
          msg: '🚫 Chỉ admin hoặc support bot mới có thể bật/tắt chức năng voice!',
          ttl: 30000
        }, threadId, type);
      }

      // Cập nhật trạng thái voice
      groupData.voice_enabled = (action === 'on');

      // Lưu vào database
      await Threads.setData(threadId, groupData);

      const statusText = action === 'on' ? 'bật' : 'tắt';
      return api.sendMessage({
        msg: `✅ Đã ${statusText} chức năng voice cho nhóm này!`,
        ttl: 30000
      }, threadId, type);
    }

    // Kiểm tra xem chức năng có được bật không (mặc định là bật)
    if (groupData.voice_enabled === false) {
      return api.sendMessage({
        msg: '❌ Chức năng voice đang tắt!\n\n' +
             '💡 Sử dụng "voice on" để bật chức năng\n' +
             '💡 Sử dụng "voice off" để tắt chức năng',
        ttl: 30000
      }, threadId, type);
    }

    // Hiển thị hướng dẫn nếu không có args
    if (args.length === 0) {
      const voiceFiles = listVoiceFiles();
      let helpMsg = '🎵 **Hướng dẫn sử dụng Voice**\n\n' +
                   '**Cách sử dụng:**\n' +
                   '• voice [URL] - Gửi voice từ URL\n' +
                   '• voice [tên file] - Gửi voice từ file local\n\n' +
                   '**Định dạng hỗ trợ:**\n' +
                   CONFIG.supportedFormats.join(', ') + '\n\n' +
                   '**Giới hạn:** Tối đa 10MB';
      
      if (voiceFiles.length > 0) {
        helpMsg += '\n\n**File có sẵn:**\n' + voiceFiles.join(', ');
      }
      
      return api.sendMessage({
        msg: helpMsg,
        ttl: 60000
      }, threadId, type);
    }

    const input = args.join(' ').trim();

    // Kiểm tra xem input có phải URL không
    const isUrl = input.startsWith('http://') || input.startsWith('https://');

    // Gửi tin nhắn đang xử lý
    const processingMsg = await api.sendMessage({
      msg: `🎵 Đang xử lý voice${isUrl ? ' từ URL' : ' từ file'}...`,
      ttl: 10000
    }, threadId, type);

    let result;
    
    if (isUrl) {
      // Gửi voice từ URL
      result = await Promise.race([
        sendVoiceFromUrl(api, event, input),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), CONFIG.timeout)
        )
      ]);
    } else {
      // Gửi voice từ file local
      result = await sendVoiceFromFile(api, event, input);
    }

    if (!result.success) {
      return api.sendMessage({
        msg: `❌ Không thể gửi voice: ${result.error}`,
        ttl: 20000
      }, threadId, type);
    }

    // Thành công - voice đã được gửi
    console.log(`✅ Đã gửi voice thành công`);

  } catch (error) {
    console.error('❌ Lỗi trong lệnh voice:', error);
    
    if (error.message === 'Timeout') {
      return api.sendMessage({
        msg: '⏰ Xử lý voice quá lâu, vui lòng thử lại!',
        ttl: 20000
      }, threadId, type);
    }
    
    return api.sendMessage({
      msg: '❌ Đã xảy ra lỗi khi gửi voice!',
      ttl: 20000
    }, threadId, type);
  }
};
