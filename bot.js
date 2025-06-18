import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';

console.log('봇 시작 중...');
console.log('사용 중인 토큰(마스킹됨):', process.env.DISCORD_TOKEN ? '✓ 설정됨' : '✗ 없음');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent  // 개발자 포털에서 활성화됨
    // GatewayIntentBits.GuildMembers  // 개발자 포털에서 비활성화 상태
  ]
});

client.once('ready', () => {
  console.log('Discord 봇 온라인!');
  console.log(`봇 이름: ${client.user.tag}`);
  
  // 봇이 연결된 서버 정보 출력
  console.log(`연결된 서버 수: ${client.guilds.cache.size}`);
  
  if (client.guilds.cache.size > 0) {
    client.guilds.cache.forEach(guild => {
      console.log(`서버 이름: ${guild.name}, 서버 ID: ${guild.id}`);
      console.log(`서버 멤버 수: ${guild.memberCount}`);
    });
  } else {
    console.log('봇이 어떤 서버에도 연결되어 있지 않습니다.');
    console.log('1. 봇이 서버에 초대되었는지 확인하세요.');
    console.log('2. .env 파일의 DISCORD_TOKEN이 최신 상태인지 확인하세요.');
    console.log('3. Discord 개발자 포털에서 봇을 다시 초대해보세요.');
  }
});

// 서버 참가 이벤트 추가
client.on(Events.GuildCreate, guild => {
  console.log(`새로운 서버에 참가했습니다: ${guild.name} (id: ${guild.id})`);
  console.log(`이 서버의 멤버 수: ${guild.memberCount}`);
});

// 에러 핸들링
client.on(Events.Error, error => {
  console.error('Discord 클라이언트 에러:', error);
});

// 디버그 정보: 이벤트 리스너가 등록되어 있는지 확인
console.log('이벤트 리스너 등록됨: ready, guildCreate, error');

// 권한 확인용 명령어: !ping
client.on('messageCreate', msg => {
  if (msg.content === '!ping') {
    msg.reply('pong! (권한 정상)');
  }
});

client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log('로그인 성공!'))
  .catch(error => {
    console.error('로그인 실패!', error);
    console.log('토큰이 올바른지 확인하세요. Discord 개발자 포털에서 토큰을 재생성해 보세요.');
  });
