module.exports.config = {
  name: 'reloadconfig',
  version: '1.0.0',
  role: 2,
  author: 'Jukaza208',
  description: 'Tải lại config',
  category: 'Hệ thống',
  usage: 'reloadconfig',
  cooldowns: 2,
  dependencies: {}
};

module.exports.run = async ({ event, api }) => {
  const { threadId, type } = event;

  const { reloadConfig } = require("../../utils/helpers");

  await reloadConfig();

  return api.sendMessage({
    msg: "Tải lại config thành công",
    ttl: 30000  // Tự xóa sau 30 giây
  }, threadId, type);

};
