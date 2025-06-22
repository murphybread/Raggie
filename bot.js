import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { collectRecentMessagesForChannel } from "./utils/logCollector.js";


// 로그를 파일에도 저장하는 함수
function appendLogToFile(logLine) {
  const logDir = "logs";
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, "bot.log");
  fs.appendFileSync(logFile, logLine + "\n");
}

// 기존 console.log/error를 가로채기 위해 원본 함수를 저장
const origLog = console.log;
const origErr = console.error;

// console.log의 작동 방식 재정의
console.log = (...args) => {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const finalLogLine = `[${new Date().toISOString()}] ${msg}`;
  origLog(finalLogLine);
  appendLogToFile(finalLogLine);
};

// console.error의 작동 방식 재정의
console.error = (...args) => {
  const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
  const finalLogLine = `[${new Date().toISOString()}] [ERROR] ${msg}`;
  origErr(finalLogLine);
  appendLogToFile(finalLogLine);
};

// 여러 채널 지원: .env에 TARGET_CHANNEL_IDS=123,456,789 형태로 지정
const TARGET_CHANNEL_IDS = process.env.TARGET_CHANNEL_IDS
  ? process.env.TARGET_CHANNEL_IDS.split(',').map(id => id.trim()).filter(Boolean)
  : (process.env.TARGET_CHANNEL_ID ? [process.env.TARGET_CHANNEL_ID] : []);

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

  // 5분마다 자동 수집 시작
  setInterval(collectAllChannels, 1 * 60 * 1000);
  // 봇 시작 시 1회 즉시 실행
  collectAllChannels();
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









async function collectAllChannels() {
  for (const channelId of TARGET_CHANNEL_IDS) {
    // client 객체를 인자로 넘겨줍니다.
    await collectRecentMessagesForChannel(client, channelId);
  }
}

// commands 폴더의 명령어를 client.commands에 저장
client.commands = new Map();
const commandsPath = path.join(process.cwd(), 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const fileUrl = (await import('url')).pathToFileURL(path.join(commandsPath, file)).href;
    const command = (await import(fileUrl)).default;
    if (command && command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

// 슬래시 명령어(interaction) 처리
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({ content: "알 수 없는 명령어입니다.", flags: 64 }).catch(console.error);
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    // 모든 오류는 여기서 처리 (추가 응답 시도하지 않음)
    console.error(`명령어 [${interaction.commandName}] 실행 중 오류 발생:`);
    console.error(error.stack || error);
  }
});

// 비동기 함수 예외 처리 및 프로세스 종료 감지
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

client.on('shardDisconnect', (event, id) => {
  console.error(`Shard ${id} disconnected:`, event);
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

// 최상위 비동기 함수에서 로그인 처리
async function main() {
  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('로그인 성공!');
  } catch (error) {
    console.error('로그인 실패!', error);
    console.log('토큰이 올바른지 확인하세요. Discord 개발자 포털에서 토큰을 재생성해 보세요.');
    process.exit(1);
  }
}
main();

console.log('봇 코드가 끝까지 실행되었습니다. 이벤트 루프가 유지되어야 합니다.');
