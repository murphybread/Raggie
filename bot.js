import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

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
  setInterval(collectAllChannels, 5 * 60 * 1000);
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

// 날짜별 파일명 생성 함수
function getLogFileName(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `logs/messages_${y}${m}${d}.json`;
}

function sanitizeChannelName(name) {
  return name ? name.replace(/[^a-zA-Z0-9_]/g, '_') : 'unknown';
}

function getLogFileNameByChannel(channelId, channelName, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const safeName = sanitizeChannelName(channelName);
  return `logs/messages_${safeName}_${channelId}_${y}${m}${d}.json`;
}

// 5분마다 메시지 자동 수집 (누락 없이, 날짜별 저장, 다양한 정보 파싱)
async function collectRecentMessages() {
  if (!TARGET_CHANNEL_ID) {
    console.log('TARGET_CHANNEL_ID가 .env에 설정되어 있지 않습니다.');
    return;
  }
  const channel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.log('채널을 찾을 수 없거나 텍스트 채널이 아닙니다.');
    return;
  }
  const logFile = getLogFileName();
  // logs 폴더 없으면 생성
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile));
  }
  // 마지막 저장된 메시지 ID 찾기
  const lastMsgId = logs.length > 0 ? logs[logs.length - 1].id : undefined;
  let fetched = [];
  let lastId = lastMsgId;
  let fetchCount = 0;
  const startTime = new Date();
  let firstFetchedId = null;
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.after = lastId;
    const batch = await channel.messages.fetch(options).catch(() => null);
    if (!batch || batch.size === 0) break;
    // 시간순 정렬
    const sorted = Array.from(batch.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    if (!firstFetchedId && sorted.length > 0) firstFetchedId = sorted[0].id;
    fetched.push(...sorted);
    lastId = sorted[sorted.length - 1].id;
    fetchCount += sorted.length;
    if (batch.size < 100) break; // 더 이상 없음
  }
  if (fetched.length === 0) {
    console.log(`${startTime.toISOString()} ~ ${endTime.toISOString()} 새 메시지 없음`);
    return;
  }
  fetched.forEach(msg => {
    logs.push({
      id: msg.id,
      author: msg.author.username,
      authorId: msg.author.id,
      content: msg.content,
      channel: msg.channel.id,
      channelName: msg.channel.name,
      timestamp: msg.createdAt.toISOString(),
      attachments: msg.attachments.map(a => a.url),
      mentions: msg.mentions.users.map(u => u.id),
      isBot: msg.author.bot,
      referencedMessageId: msg.reference?.messageId || null
    });
  });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  const endTime = new Date();
  let lastMsgInfo = '';
  if (fetched.length > 0) {
    const lastMsg = fetched[fetched.length - 1];
    lastMsgInfo = `ID: ${lastMsg.id}, 내용: ${lastMsg.content}`;
  }
  console.log(`[자동수집] ${startTime.toISOString()} ~ ${endTime.toISOString()} | 새 메시지 ${fetched.length}개 저장 완료 (마지막 메시지: ${lastMsgInfo}) | 파일: ${logFile}`);
}

// 여러 채널의 메시지 자동 수집
async function collectRecentMessagesForChannel(channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    console.log(`[${channelId}] 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.`);
    return;
  }
  const logFile = getLogFileNameByChannel(channelId, channel.name);
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  let logs = [];
  if (fs.existsSync(logFile)) {
    logs = JSON.parse(fs.readFileSync(logFile));
  }
  // 마지막 저장된 메시지 ID 찾기
  const lastMsgId = logs.length > 0 ? logs[logs.length - 1].id : undefined;
  let fetched = [];
  let lastId = lastMsgId;
  const startTime = new Date();
  let lastMsgInfo = '';
  while (true) {
    const options = { limit: 100 };
    if (lastId) options.after = lastId;
    const batch = await channel.messages.fetch(options).catch(() => null);
    if (!batch || batch.size === 0) break;
    const sorted = Array.from(batch.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    fetched.push(...sorted);
    lastId = sorted[sorted.length - 1].id;
    if (batch.size < 100) break;
  }
  if (fetched.length === 0) {
    const endTime = new Date();
    console.log(`[${channelId}] ${startTime.toISOString()} ~ ${endTime.toISOString()}  새 메시지 없음`);
    return;
  }
  fetched.forEach(msg => {

    const embedData = msg.embeds.map((embed) => {
      return {
        author: embed.author?.name || null,
        title: embed.title || null,
        description: embed.description || null,
        fields: embed.fields.map((field) => ({ name: field.name, value: field.value })),
        footer: embed.footer?.text || null,
      };
    });
    logs.push({
      id: msg.id,
      author: msg.author.username,
      authorId: msg.author.id,
      content: msg.content,
      embeds: embedData,
      channel: msg.channel.id,
      channelName: msg.channel.name,
      timestamp: msg.createdAt.toISOString(),
      attachments: msg.attachments.map((a) => a.url),
      mentions: msg.mentions.users.map((u) => u.id),
      isBot: msg.author.bot,
      referencedMessageId: msg.reference?.messageId || null,
    });
  });
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  const endTime = new Date();
  if (fetched.length > 0) {
    const lastMsg = fetched[fetched.length - 1];
    lastMsgInfo = `ID: ${lastMsg.id}, 내용: ${lastMsg.content}`;
  }
  console.log(`[${channelId}] [자동수집] ${startTime.toISOString()} ~ ${endTime.toISOString()} | 새 메시지 ${fetched.length}개 저장 완료 (마지막 메시지: ${lastMsgInfo}) | 파일: ${logFile}`);
}

async function collectAllChannels() {
  for (const channelId of TARGET_CHANNEL_IDS) {
    await collectRecentMessagesForChannel(channelId);
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
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({ content: '알 수 없는 명령어입니다.', ephemeral: true });
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('명령어 실행 중 오류가 발생했습니다.');
    } else {
      await interaction.reply({ content: '명령어 실행 중 오류가 발생했습니다.', ephemeral: true });
    }
  }
});

// 로그를 파일에도 저장하는 함수
function appendLogToFile(...args) {
  const logDir = 'logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, 'bot.log');
  const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
}

// 기존 console.log/error를 가로채서 파일에도 기록
const origLog = console.log;
const origErr = console.error;
console.log = (...args) => {
  origLog(...args);
  appendLogToFile(...args);
};
console.error = (...args) => {
  origErr(...args);
  appendLogToFile('[ERROR]', ...args);
};

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
