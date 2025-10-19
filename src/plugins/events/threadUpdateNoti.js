const { ThreadType, GroupEventType } = require("zca-js");
const path = require("path");
const fs = require("fs").promises;
const axios = require("axios");

module.exports.config = {
    name: "threadUpdateNoti",
    event_type: ["group_event", "message"],
    version: "1.1.0",
    author: "Soulmate",
    description: "Thông báo chi tiết tất cả hoạt động cập nhật trong nhóm và tự xóa sau 5 giây."
};

// DISABLED - Chức năng thông báo cập nhật nhóm đã bị tắt
module.exports.run = async function({ api, event }) {
    // Chức năng đã bị comment để chỉ giữ lại log tin nhắn
    return;
};