import { REST, Routes } from 'discord.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// 로그 파일에도 기록하는 함수
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

const commands = [];
const commandsPath = path.join(process.cwd(), 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  // file:// URL로 변환하여 import (OS 상관없이 동작)
  const fileUrl = pathToFileURL(path.join(commandsPath, file)).href;
  const command = (await import(fileUrl)).default;
  if (command && command.data) {
    commands.push(command.data);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// 길드(서버) 단위로 빠르게 등록 (테스트용)
const GUILD_ID = process.env.TEST_GUILD_ID; // .env에 테스트 서버 ID를 넣으세요
const CLIENT_ID = process.env.CLIENT_ID; // .env에 봇의 클라이언트ID를 넣으세요

async function main() {
  try {
    if (!GUILD_ID || !CLIENT_ID) {
      console.error('TEST_GUILD_ID, CLIENT_ID를 .env에 설정하세요.');
      process.exit(1);
    }
    const commandNames = commands.map(cmd => cmd.name).join(', ');
    const logMsg = `슬래시 명령어 등록 시작: [${commandNames}]`;
    console.log(`[${new Date().toISOString()}] ${logMsg}`);
    appendLogToFile(logMsg);
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log(`[${new Date().toISOString()}]슬래시 명령어 등록 완료! [${commandNames}]`);
    appendLogToFile(`슬래시 명령어 등록 완료! [${commandNames}]`);
  } catch (error) {
    console.error(error);
    appendLogToFile('[ERROR]', error);
  }
}
main();
