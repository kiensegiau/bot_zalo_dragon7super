const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { ThreadType } = require('zca-js');

// Cấu hình chung
const CONFIG = {
  maxRetries: 10,
  checkTimeout: 3000,
  retryDelay: 1000,
  fallbackToDownload: true, // Fallback về cách cũ nếu sendVideo thất bại
};

// Các hàm utility
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkVideoUrl = async (url) => {
  try {
    await Promise.race([
      axios.head(url, {
        timeout: CONFIG.checkTimeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }),
      delay(CONFIG.checkTimeout).then(() => {
        throw new Error("Timeout khi kiểm tra URL -> Chuyển qua link khác");
      }),
    ]);
    return true;
  } catch (error) {
    return false;
  }
};

// Hàm lấy thông tin video từ URL
const getVideoInfo = async (videoUrl) => {
  try {
    const response = await axios.head(videoUrl, {
      timeout: CONFIG.checkTimeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const contentType = response.headers['content-type'] || '';
    const contentLength = parseInt(response.headers['content-length'] || '0');

    return {
      isVideo: contentType.includes('video/'),
      fileSize: contentLength,
      contentType
    };
  } catch (error) {
    return { isVideo: false, fileSize: 0, contentType: '' };
  }
};

// Hàm gửi video trực tiếp qua URL (sử dụng ZCA-JS sendVideo API)
async function sendVideoDirectly(api, event, videoUrl, videoType) {
  try {
    console.log(`🎬 Đang gửi video trực tiếp: ${videoUrl}`);

    // Lấy thông tin video
    const videoInfo = await getVideoInfo(videoUrl);
    if (!videoInfo.isVideo) {
      console.log(`❌ URL không phải video hợp lệ: ${videoUrl}`);
      return { success: false, shouldRemove: true };
    }

    // Tạo thumbnail URL (có thể dùng cùng URL hoặc tạo thumbnail riêng)
    const thumbnailUrl = videoUrl; // Tạm thời dùng cùng URL

    // Cấu hình video options
    const videoOptions = {
      msg: `🎬 Video ${videoType} ngẫu nhiên`,
      videoUrl: videoUrl,
      thumbnailUrl: thumbnailUrl,
      duration: 30000, // 30 giây (mặc định)
      width: 1280,
      height: 720,
      ttl: 300000 // Tin nhắn tự xóa sau 5 phút
    };

    // Gửi video sử dụng ZCA-JS API
    const result = await api.sendVideo(videoOptions, event.threadId, event.type);

    if (result && result.msgId) {
      console.log(`✅ Đã gửi video thành công qua URL: ${videoType}`);
      return { success: true, shouldRemove: false };
    } else {
      console.log(`❌ Không thể gửi video qua URL: ${videoUrl}`);
      return { success: false, shouldRemove: false };
    }

  } catch (error) {
    console.error(`❌ Lỗi khi gửi video trực tiếp: ${error.message}`);

    // Phân loại lỗi để quyết định có xóa link không
    const shouldRemove =
      error.message.includes('404') ||
      error.message.includes('403') ||
      error.message.includes('Invalid URL') ||
      error.message.includes('Unable to get video content');

    return { success: false, shouldRemove };
  }
}

// Hàm tải video và tạo file tạm (fallback method)
async function downloadVideo(videoUrl) {
  try {
    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,  // 30 giây timeout cho video
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `video_${Date.now()}.mp4`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, response.data);
    return { success: true, filePath, error: null, shouldRemove: false };
  } catch (error) {
    console.error('Lỗi khi tải video:', error.message);

    // Phân loại lỗi để quyết định có xóa link không
    const shouldRemove =
      error.response?.status === 404 ||           // Not Found
      error.response?.status === 403 ||           // Forbidden (link chết)
      error.response?.status === 410 ||           // Gone
      error.code === 'ENOTFOUND' ||               // Domain không tồn tại
      error.message.includes('Invalid URL');      // URL không hợp lệ

    return {
      success: false,
      filePath: null,
      error: error.message,
      shouldRemove
    };
  }
}

// Xử lý video từ file - Ưu tiên gửi trực tiếp, fallback về tải local
async function handleVideoFromFile(api, event, filePath, videoType) {
  let videoLinks = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);
  let isDieLink = false;

  while (videoLinks.length > 0) {
    const randomIndex = Math.floor(Math.random() * videoLinks.length);
    const videoUrl = videoLinks[randomIndex].trim();

    // Kiểm tra URL có hợp lệ không
    const isValid = await checkVideoUrl(videoUrl);

    if (isValid) {
      try {
        // Phương pháp 1: Thử gửi video trực tiếp qua URL (ZCA-JS sendVideo API)
        console.log(`🚀 Thử gửi video trực tiếp: ${videoUrl}`);
        const directResult = await sendVideoDirectly(api, event, videoUrl, videoType);

        if (directResult.success) {
          // Gửi thành công qua URL - cập nhật file nếu có link chết đã bị xóa
          if (isDieLink) {
            fs.writeFileSync(filePath, videoLinks.join('\n'));
            console.log(`📝 Đã cập nhật file, xóa các link chết`);
          }
          return true;
        }

        // Nếu link chết thì xóa và thử link khác
        if (directResult.shouldRemove) {
          console.log(`🗑️ Xóa link chết: ${videoUrl}`);
          videoLinks.splice(randomIndex, 1);
          isDieLink = true;
          continue;
        }

        // Phương pháp 2: Fallback - Tải video về local nếu cấu hình cho phép
        if (CONFIG.fallbackToDownload) {
          console.log(`⬇️ Fallback: Tải video về local: ${videoUrl}`);
          const downloadResult = await downloadVideo(videoUrl);

          if (!downloadResult.success) {
            console.log(`❌ Không thể tải video: ${videoUrl} - Lỗi: ${downloadResult.error}`);

            // Chỉ xóa link nếu là lỗi thực sự về link chết
            if (downloadResult.shouldRemove) {
              videoLinks.splice(randomIndex, 1);
              isDieLink = true;
              console.log(`🗑️ Đã xóa link chết: ${videoUrl}`);
            }
            continue;
          }

          const videoPath = downloadResult.filePath;

          // Gửi video đã tải về
          await api.sendMessage({
            msg: `🎬 Video ${videoType} ngẫu nhiên`,
            attachments: [videoPath],
            ttl: 300000  // Tin nhắn tự xóa sau 5 phút
          }, event.threadId, event.type);

          console.log(`✅ Đã gửi video thành công (fallback): ${videoType}`);

          // Gửi thành công - cập nhật file nếu có link chết đã bị xóa
          if (isDieLink) {
            fs.writeFileSync(filePath, videoLinks.join('\n'));
            console.log(`📝 Đã cập nhật file, xóa các link chết`);
          }

          // Xóa file tạm sau khi gửi
          setTimeout(() => {
            try {
              if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
                console.log(`🗑️ Đã xóa file tạm: ${path.basename(videoPath)}`);
              }
            } catch (error) {
              console.error('Lỗi khi xóa file tạm:', error.message);
            }
          }, 5000);

          return true;
        } else {
          console.log(`❌ Không thể gửi video và fallback bị tắt: ${videoUrl}`);
          continue;
        }

      } catch (error) {
        console.error("❌ Lỗi khi xử lý video:", error);
        continue;
      }
    } else {
      console.log(`❌ URL không hợp lệ, đã xóa: ${videoUrl}`);
      videoLinks.splice(randomIndex, 1);
      isDieLink = true;
    }
  }

  console.log(`❌ Không còn video hợp lệ trong file ${path.basename(filePath)}`);
  return false;
}

module.exports.config = {
  name: "video",
  version: "3.0.0",
  role: 0,
  author: "Assistant",
  description: "Gửi video ngẫu nhiên từ thư mục video. Ưu tiên gửi trực tiếp qua URL, fallback về tải local. Sử dụng 'video on/off' để bật/tắt",
  category: "Giải trí",
  usage: "video [on/off] [anime/cosplay/girl/sex/sexy]",
  cooldowns: 5
};

// Đường dẫn đến thư mục chứa các file txt
const videoPath = path.join(__dirname, '../../../assets/videos');

// Danh sách các loại video có sẵn
const videoTypes = ['anime', 'cosplay', 'girl', 'sex', 'sexy'];

// Mapping file names
const fileMapping = {
  'anime': 'vdanime.txt',
  'cosplay': 'vdcos.txt',
  'girl': 'vdgirl.txt',
  'sex': 'vdsex.txt',
  'sexy': 'vdsexy.txt'
};





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

      if (!isBotAdmin && !isSupport) {
        return api.sendMessage({
          msg: '🚫 Chỉ admin hoặc support bot mới có thể bật/tắt chức năng video!',
          ttl: 30000  // Tự xóa sau 30 giây
        }, threadId, type);
      }

      // Cập nhật trạng thái video
      groupData.video_enabled = (action === 'on');

      // Lưu vào database
      await Threads.setData(threadId, groupData);

      const statusText = action === 'on' ? 'bật' : 'tắt';
      return api.sendMessage({
        msg: `✅ Đã ${statusText} chức năng video cho nhóm này!`,
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }

    // Kiểm tra xem chức năng có được bật không (mặc định là tắt)
    if (groupData.video_enabled !== true) {
      return api.sendMessage({
        msg: '❌ Chức năng video đang tắt!\n\n' +
             '💡 Sử dụng "video on" để bật chức năng\n' +
             '💡 Sử dụng "video off" để tắt chức năng',
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }

    // Lấy loại video từ args (nếu có)
    const requestedType = args[0] ? args[0].toLowerCase() : null;

    // Kiểm tra loại video có hợp lệ không
    if (requestedType && !videoTypes.includes(requestedType)) {
      return api.sendMessage({
        msg: `❌ Loại video không hợp lệ!\n\n` +
             `📋 Các loại có sẵn: ${videoTypes.join(', ')}\n` +
             `💡 Sử dụng: video [${videoTypes.join('|')}]`,
        ttl: 30000  // Tự xóa sau 30 giây
      }, threadId, type);
    }

    // Lấy video ngẫu nhiên và xử lý theo logic mới
    const selectedType = requestedType || videoTypes[Math.floor(Math.random() * videoTypes.length)];
    const fileName = fileMapping[selectedType];
    const filePath = path.join(videoPath, fileName);

    if (!fs.existsSync(filePath)) {
      return api.sendMessage({
        msg: '❌ Không tìm thấy file video!',
        ttl: 20000
      }, threadId, type);
    }

    // Sử dụng hàm xử lý video mới
    const success = await handleVideoFromFile(api, event, filePath, selectedType);

    if (!success) {
      return api.sendMessage({
        msg: '❌ Không thể gửi video. Vui lòng thử lại sau!',
        ttl: 20000  // Tự xóa sau 20 giây
      }, threadId, type);
    }

  } catch (error) {
    console.error('Lỗi trong command video:', error);
    api.sendMessage({
      msg: '❌ Có lỗi xảy ra khi xử lý lệnh!',
      ttl: 20000  // Tự xóa sau 20 giây
    }, threadId, type);
  }
};
