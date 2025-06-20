export default {
  data: {
    name: 'ping',
    description: '권한 확인용 핑 명령어'
  },
  async execute(interaction) {
    await interaction.reply('pong! (권한 정상)');
  }
};
