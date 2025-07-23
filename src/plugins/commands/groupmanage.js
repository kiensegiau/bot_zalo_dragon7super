const { ThreadType } = require('zca-js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports.config = {
  name: "groupmanage",
  version: "1.0.0",
  role: 1, // Cần quyền admin nhóm
  author: "Assistant",
  description: "Quản lý nhóm nâng cao: thêm/xóa thành viên, đổi tên, đổi avatar, thông tin nhóm",
  category: "Quản lý",
  usage: "groupmanage [add/remove/rename/avatar/info/members] [tham số]",
  cooldowns: 5
};

// Cấu hình
const CONFIG = {
  maxImageSize: 5 * 1024 * 1024, // 5MB
  supportedImageFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  timeout: 15000,
};

// Hàm kiểm tra quyền admin nhóm
async function checkGroupAdmin(api, groupId, userId) {
  try {
    const groupInfo = await api.getGroupInfo(groupId);
    const groupData = groupInfo.gridInfoMap[groupId];
    
    if (!groupData) return false;
    
    // Kiểm tra xem user có phải admin không
    const isOwner = groupData.creatorId === userId;
    const isAdmin = groupData.adminIds && groupData.adminIds.includes(userId);
    
    return isOwner || isAdmin;
  } catch (error) {
    console.error('Lỗi khi kiểm tra quyền admin:', error);
    return false;
  }
}

// Hàm thêm thành viên vào nhóm
async function addUserToGroup(api, groupId, userIds) {
  try {
    console.log(`👥 Đang thêm ${userIds.length} thành viên vào nhóm ${groupId}`);
    
    const result = await api.addUserToGroup(userIds, groupId);
    
    if (result) {
      console.log(`✅ Đã thêm thành viên thành công`);
      return { success: true, result };
    } else {
      return { success: false, error: 'Không thể thêm thành viên' };
    }
  } catch (error) {
    console.error(`❌ Lỗi khi thêm thành viên: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm xóa thành viên khỏi nhóm
async function removeUserFromGroup(api, groupId, userIds) {
  try {
    console.log(`👥 Đang xóa ${userIds.length} thành viên khỏi nhóm ${groupId}`);
    
    const result = await api.removeUserFromGroup(userIds, groupId);
    
    if (result) {
      console.log(`✅ Đã xóa thành viên thành công`);
      return { success: true, result };
    } else {
      return { success: false, error: 'Không thể xóa thành viên' };
    }
  } catch (error) {
    console.error(`❌ Lỗi khi xóa thành viên: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm đổi tên nhóm
async function changeGroupName(api, groupId, newName) {
  try {
    console.log(`📝 Đang đổi tên nhóm ${groupId} thành: "${newName}"`);
    
    const result = await api.changeGroupName(newName, groupId);
    
    if (result) {
      console.log(`✅ Đã đổi tên nhóm thành công`);
      return { success: true, result };
    } else {
      return { success: false, error: 'Không thể đổi tên nhóm' };
    }
  } catch (error) {
    console.error(`❌ Lỗi khi đổi tên nhóm: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm đổi avatar nhóm
async function changeGroupAvatar(api, groupId, imageUrl) {
  try {
    console.log(`🖼️ Đang đổi avatar nhóm ${groupId} với URL: ${imageUrl}`);
    
    // Kiểm tra URL hình ảnh
    const response = await axios.head(imageUrl, { timeout: CONFIG.timeout });
    const contentType = response.headers['content-type'] || '';
    const contentLength = parseInt(response.headers['content-length'] || '0');
    
    if (!contentType.includes('image/')) {
      return { success: false, error: 'URL không phải hình ảnh' };
    }
    
    if (contentLength > CONFIG.maxImageSize) {
      return { success: false, error: 'Hình ảnh quá lớn (>5MB)' };
    }
    
    const result = await api.changeGroupAvatar(imageUrl, groupId);
    
    if (result) {
      console.log(`✅ Đã đổi avatar nhóm thành công`);
      return { success: true, result };
    } else {
      return { success: false, error: 'Không thể đổi avatar nhóm' };
    }
  } catch (error) {
    console.error(`❌ Lỗi khi đổi avatar nhóm: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Hàm lấy thông tin nhóm chi tiết
async function getGroupDetails(api, groupId) {
  try {
    const groupInfo = await api.getGroupInfo(groupId);
    const groupData = groupInfo.gridInfoMap[groupId];
    
    if (!groupData) {
      return { success: false, error: 'Không thể lấy thông tin nhóm' };
    }
    
    const membersInfo = await api.getGroupMembersInfo(groupId);
    
    return {
      success: true,
      data: {
        name: groupData.name,
        avatar: groupData.avatar,
        creatorId: groupData.creatorId,
        adminIds: groupData.adminIds || [],
        totalMembers: groupData.totalMembers,
        members: membersInfo.members || []
      }
    };
  } catch (error) {
    console.error(`❌ Lỗi khi lấy thông tin nhóm: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports.run = async function({ api, event, args, Threads }) {
  const { threadId, type } = event;
  const senderID = event.data?.uidFrom || event.senderID;

  try {
    // Chỉ hoạt động trong nhóm
    if (type !== ThreadType.Group) {
      return api.sendMessage({
        msg: '❌ Lệnh này chỉ có thể sử dụng trong nhóm chat!',
        ttl: 30000
      }, threadId, type);
    }

    // Kiểm tra quyền admin nhóm
    const isGroupAdmin = await checkGroupAdmin(api, threadId, senderID);
    if (!isGroupAdmin) {
      return api.sendMessage({
        msg: '🚫 Chỉ admin nhóm mới có thể sử dụng lệnh này!',
        ttl: 30000
      }, threadId, type);
    }

    // Hiển thị hướng dẫn nếu không có args
    if (args.length === 0) {
      return api.sendMessage({
        msg: '👥 **Hướng dẫn Quản lý Nhóm**\n\n' +
             '**Các lệnh có sẵn:**\n' +
             '• `groupmanage add @user` - Thêm thành viên\n' +
             '• `groupmanage remove @user` - Xóa thành viên\n' +
             '• `groupmanage rename "Tên mới"` - Đổi tên nhóm\n' +
             '• `groupmanage avatar [URL]` - Đổi avatar nhóm\n' +
             '• `groupmanage info` - Xem thông tin nhóm\n' +
             '• `groupmanage members` - Danh sách thành viên\n\n' +
             '**Lưu ý:** Chỉ admin nhóm mới có thể sử dụng',
        ttl: 60000
      }, threadId, type);
    }

    const action = args[0].toLowerCase();
    const { data } = event;

    switch (action) {
      case 'add': {
        // Thêm thành viên
        let userIds = [];
        
        if (data.mentions && Object.keys(data.mentions).length > 0) {
          userIds = Object.keys(data.mentions);
        } else if (args.length > 1) {
          // Lấy user ID từ args
          userIds = args.slice(1).filter(id => id && !isNaN(id));
        }
        
        if (userIds.length === 0) {
          return api.sendMessage({
            msg: '❌ Vui lòng tag người dùng hoặc nhập User ID để thêm vào nhóm!',
            ttl: 30000
          }, threadId, type);
        }
        
        const result = await addUserToGroup(api, threadId, userIds);
        
        if (result.success) {
          return api.sendMessage({
            msg: `✅ Đã thêm ${userIds.length} thành viên vào nhóm thành công!`,
            ttl: 30000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể thêm thành viên: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      case 'remove': {
        // Xóa thành viên
        let userIds = [];
        
        if (data.mentions && Object.keys(data.mentions).length > 0) {
          userIds = Object.keys(data.mentions);
        } else if (args.length > 1) {
          userIds = args.slice(1).filter(id => id && !isNaN(id));
        }
        
        if (userIds.length === 0) {
          return api.sendMessage({
            msg: '❌ Vui lòng tag người dùng hoặc nhập User ID để xóa khỏi nhóm!',
            ttl: 30000
          }, threadId, type);
        }
        
        const result = await removeUserFromGroup(api, threadId, userIds);
        
        if (result.success) {
          return api.sendMessage({
            msg: `✅ Đã xóa ${userIds.length} thành viên khỏi nhóm thành công!`,
            ttl: 30000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể xóa thành viên: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      case 'rename': {
        // Đổi tên nhóm
        const newName = args.slice(1).join(' ').trim().replace(/"/g, '');
        
        if (!newName) {
          return api.sendMessage({
            msg: '❌ Vui lòng nhập tên mới cho nhóm!\n💡 Ví dụ: groupmanage rename "Tên nhóm mới"',
            ttl: 30000
          }, threadId, type);
        }
        
        if (newName.length > 100) {
          return api.sendMessage({
            msg: '❌ Tên nhóm không được dài quá 100 ký tự!',
            ttl: 30000
          }, threadId, type);
        }
        
        const result = await changeGroupName(api, threadId, newName);
        
        if (result.success) {
          return api.sendMessage({
            msg: `✅ Đã đổi tên nhóm thành: "${newName}"`,
            ttl: 30000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể đổi tên nhóm: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      case 'avatar': {
        // Đổi avatar nhóm
        const imageUrl = args[1];
        
        if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
          return api.sendMessage({
            msg: '❌ Vui lòng nhập URL hình ảnh hợp lệ!\n💡 Ví dụ: groupmanage avatar https://example.com/image.jpg',
            ttl: 30000
          }, threadId, type);
        }
        
        const result = await changeGroupAvatar(api, threadId, imageUrl);
        
        if (result.success) {
          return api.sendMessage({
            msg: `✅ Đã đổi avatar nhóm thành công!`,
            ttl: 30000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể đổi avatar nhóm: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      case 'info': {
        // Xem thông tin nhóm
        const result = await getGroupDetails(api, threadId);
        
        if (result.success) {
          const { data } = result;
          const infoMsg = `📊 **Thông tin nhóm**\n\n` +
                         `📝 **Tên:** ${data.name}\n` +
                         `👑 **Chủ nhóm:** ${data.creatorId}\n` +
                         `👥 **Tổng thành viên:** ${data.totalMembers}\n` +
                         `🛡️ **Số admin:** ${data.adminIds.length}\n` +
                         `🆔 **ID nhóm:** ${threadId}`;
          
          return api.sendMessage({
            msg: infoMsg,
            ttl: 60000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể lấy thông tin nhóm: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      case 'members': {
        // Danh sách thành viên
        const result = await getGroupDetails(api, threadId);
        
        if (result.success) {
          const { data } = result;
          const members = data.members.slice(0, 20); // Giới hạn 20 thành viên
          
          let membersMsg = `👥 **Danh sách thành viên (${Math.min(20, data.totalMembers)}/${data.totalMembers})**\n\n`;
          
          members.forEach((member, index) => {
            const role = member.id === data.creatorId ? '👑' : 
                        data.adminIds.includes(member.id) ? '🛡️' : '👤';
            membersMsg += `${index + 1}. ${role} ${member.name || 'Unknown'}\n`;
          });
          
          if (data.totalMembers > 20) {
            membersMsg += `\n... và ${data.totalMembers - 20} thành viên khác`;
          }
          
          return api.sendMessage({
            msg: membersMsg,
            ttl: 60000
          }, threadId, type);
        } else {
          return api.sendMessage({
            msg: `❌ Không thể lấy danh sách thành viên: ${result.error}`,
            ttl: 30000
          }, threadId, type);
        }
      }

      default: {
        return api.sendMessage({
          msg: '❌ Lệnh không hợp lệ!\n💡 Sử dụng `groupmanage` để xem hướng dẫn',
          ttl: 30000
        }, threadId, type);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi trong lệnh groupmanage:', error);
    return api.sendMessage({
      msg: '❌ Đã xảy ra lỗi khi thực hiện lệnh!',
      ttl: 20000
    }, threadId, type);
  }
};
