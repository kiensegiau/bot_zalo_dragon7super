const { ThreadType } = require('zca-js');

module.exports.config = {
  name: "poll",
  version: "1.0.0",
  role: 0,
  author: "Assistant",
  description: "Tạo bình chọn trong nhóm với nhiều tùy chọn. Chỉ hoạt động trong nhóm chat",
  category: "Tiện ích",
  usage: 'poll "Câu hỏi" "Lựa chọn 1" "Lựa chọn 2" [options]',
  cooldowns: 10
};

// Cấu hình
const CONFIG = {
  maxOptions: 10, // Số lượng lựa chọn tối đa
  minOptions: 2,  // Số lượng lựa chọn tối thiểu
  maxQuestionLength: 200, // Độ dài câu hỏi tối đa
  maxOptionLength: 100,   // Độ dài mỗi lựa chọn tối đa
  defaultExpiredTime: 24 * 60 * 60 * 1000, // 24 giờ (milliseconds)
};

// Hàm parse arguments từ chuỗi có dấu ngoặc kép
function parseQuotedArgs(text) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    if (char === '"' && (i === 0 || text[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ' ' && !inQuotes) {
      if (current.trim()) {
        args.push(current.trim());
        current = '';
      }
    } else {
      current += char;
    }
    i++;
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

// Hàm tạo poll
async function createPoll(api, groupId, options) {
  try {
    console.log(`📊 Đang tạo poll trong nhóm: ${groupId}`);
    console.log(`📝 Câu hỏi: "${options.question}"`);
    console.log(`📋 Lựa chọn: ${options.options.join(', ')}`);
    
    const result = await api.createPoll(options, groupId);
    
    if (result && result.poll_id) {
      console.log(`✅ Đã tạo poll thành công: ID=${result.poll_id}`);
      return { success: true, poll: result };
    } else {
      console.log(`❌ Không thể tạo poll`);
      return { success: false, error: 'Không thể tạo poll' };
    }
    
  } catch (error) {
    console.error(`❌ Lỗi khi tạo poll: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm validate input
function validatePollInput(question, options) {
  const errors = [];
  
  // Kiểm tra câu hỏi
  if (!question || question.trim().length === 0) {
    errors.push('Câu hỏi không được để trống');
  } else if (question.length > CONFIG.maxQuestionLength) {
    errors.push(`Câu hỏi không được dài quá ${CONFIG.maxQuestionLength} ký tự`);
  }
  
  // Kiểm tra số lượng lựa chọn
  if (options.length < CONFIG.minOptions) {
    errors.push(`Cần ít nhất ${CONFIG.minOptions} lựa chọn`);
  } else if (options.length > CONFIG.maxOptions) {
    errors.push(`Không được quá ${CONFIG.maxOptions} lựa chọn`);
  }
  
  // Kiểm tra độ dài mỗi lựa chọn
  for (let i = 0; i < options.length; i++) {
    if (!options[i] || options[i].trim().length === 0) {
      errors.push(`Lựa chọn ${i + 1} không được để trống`);
    } else if (options[i].length > CONFIG.maxOptionLength) {
      errors.push(`Lựa chọn ${i + 1} không được dài quá ${CONFIG.maxOptionLength} ký tự`);
    }
  }
  
  // Kiểm tra trùng lặp
  const uniqueOptions = [...new Set(options.map(opt => opt.toLowerCase().trim()))];
  if (uniqueOptions.length !== options.length) {
    errors.push('Các lựa chọn không được trùng lặp');
  }
  
  return errors;
}

module.exports.run = async function({ api, event, args, Threads }) {
  const { threadId, type } = event;
  const senderID = event.data?.uidFrom || event.senderID;

  try {
    // Chỉ hoạt động trong nhóm
    if (type !== ThreadType.Group) {
      return api.sendMessage({
        msg: '❌ Lệnh poll chỉ có thể sử dụng trong nhóm chat!',
        ttl: 30000
      }, threadId, type);
    }

    // Lấy dữ liệu nhóm
    const threadData = await Threads.getData(threadId);
    let groupData = threadData.data || {};

    // Kiểm tra xem chức năng có được bật không (mặc định là bật)
    if (groupData.poll_enabled === false) {
      return api.sendMessage({
        msg: '❌ Chức năng poll đang tắt!\n\n' +
             '💡 Admin có thể sử dụng "poll on" để bật chức năng',
        ttl: 30000
      }, threadId, type);
    }

    // Xử lý lệnh on/off (chỉ admin)
    if (args[0] && (args[0].toLowerCase() === 'on' || args[0].toLowerCase() === 'off')) {
      const action = args[0].toLowerCase();

      // Kiểm tra quyền admin hoặc support
      const senderIDStr = String(senderID);
      const isBotAdmin = global.users?.admin?.includes(senderIDStr);
      const isSupport = global.users?.support?.includes(senderIDStr);

      if (!isBotAdmin && !isSupport) {
        return api.sendMessage({
          msg: '🚫 Chỉ admin hoặc support bot mới có thể bật/tắt chức năng poll!',
          ttl: 30000
        }, threadId, type);
      }

      // Cập nhật trạng thái poll
      groupData.poll_enabled = (action === 'on');

      // Lưu vào database
      await Threads.setData(threadId, groupData);

      const statusText = action === 'on' ? 'bật' : 'tắt';
      return api.sendMessage({
        msg: `✅ Đã ${statusText} chức năng poll cho nhóm này!`,
        ttl: 30000
      }, threadId, type);
    }

    // Hiển thị hướng dẫn nếu không có args
    if (args.length === 0) {
      return api.sendMessage({
        msg: '📊 **Hướng dẫn tạo Poll**\n\n' +
             '**Cú pháp:**\n' +
             'poll "Câu hỏi" "Lựa chọn 1" "Lựa chọn 2" ...\n\n' +
             '**Ví dụ:**\n' +
             'poll "Ăn gì hôm nay?" "Phở" "Bún bò" "Cơm tấm"\n\n' +
             '**Tùy chọn nâng cao:**\n' +
             '• Tối đa 10 lựa chọn\n' +
             '• Poll sẽ tự động hết hạn sau 24 giờ\n' +
             '• Hỗ trợ đa lựa chọn và ẩn danh',
        ttl: 60000
      }, threadId, type);
    }

    // Parse arguments
    const fullText = args.join(' ');
    const parsedArgs = parseQuotedArgs(fullText);

    if (parsedArgs.length < 3) {
      return api.sendMessage({
        msg: '❌ Cần ít nhất 1 câu hỏi và 2 lựa chọn!\n\n' +
             '💡 Ví dụ: poll "Câu hỏi?" "Lựa chọn 1" "Lựa chọn 2"',
        ttl: 30000
      }, threadId, type);
    }

    const question = parsedArgs[0];
    const options = parsedArgs.slice(1);

    // Validate input
    const validationErrors = validatePollInput(question, options);
    if (validationErrors.length > 0) {
      return api.sendMessage({
        msg: '❌ **Lỗi tạo poll:**\n\n' + validationErrors.join('\n'),
        ttl: 30000
      }, threadId, type);
    }

    // Tạo poll options
    const pollOptions = {
      question: question,
      options: options,
      expiredTime: Date.now() + CONFIG.defaultExpiredTime,
      allowMultiChoices: false, // Có thể thêm tùy chọn này sau
      allowAddNewOption: false,
      hideVotePreview: false,
      isAnonymous: false
    };

    // Gửi tin nhắn đang tạo poll
    const creatingMsg = await api.sendMessage({
      msg: `📊 Đang tạo poll: "${question}"...`,
      ttl: 10000
    }, threadId, type);

    // Tạo poll
    const result = await createPoll(api, threadId, pollOptions);

    if (!result.success) {
      return api.sendMessage({
        msg: `❌ Không thể tạo poll: ${result.error}`,
        ttl: 20000
      }, threadId, type);
    }

    // Thông báo thành công
    return api.sendMessage({
      msg: `✅ **Đã tạo poll thành công!**\n\n` +
           `📝 **Câu hỏi:** ${question}\n` +
           `📋 **Lựa chọn:** ${options.length} tùy chọn\n` +
           `⏰ **Hết hạn:** 24 giờ\n\n` +
           `👆 Hãy bình chọn bằng cách nhấn vào các lựa chọn ở trên!`,
      ttl: 300000 // 5 phút
    }, threadId, type);

  } catch (error) {
    console.error('❌ Lỗi trong lệnh poll:', error);
    return api.sendMessage({
      msg: '❌ Đã xảy ra lỗi khi tạo poll!',
      ttl: 20000
    }, threadId, type);
  }
};
