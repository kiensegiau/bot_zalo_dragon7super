module.exports.config = {
  name: 'restart',
  version: '1.0.0',
  role: 2,
  author: 'Jukaza208',
  description: 'Khởi động lại bot',
  category: 'Hệ thống',
  usage: 'restart',
  cooldowns: 2,
  dependencies: {}
};

module.exports.run = async ({ event, api }) => {
  const { threadId, type } = event;

  await api.sendMessage({
    msg: "Tiến hành khởi động lại bot",
    ttl: 10000  // Tự xóa sau 10 giây (bot sẽ restart)
  }, threadId, type);

  return process.exit(2);
};
