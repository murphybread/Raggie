// ask.js
import { OpenAI } from "openai";
import { EmbedBuilder } from "discord.js";
import fs from "fs";
import path from "path";
import { getLogFileNameByChannel, collectRecentMessagesForChannel, sanitizeChannelName } from "../utils/logCollector.js";

const HISTORY_LENGTH = 15; // 최근 메시지 수

export default {
  data: {
    name: "질문",
    description: "채널의 최근 대화를 기반으로 질문에 답변합니다.",
    options: [
      {
        name: "내용",
        type: 3,
        description: "질문할 내용",
        required: true,
      },
    ],
  },

  async execute(interaction) {
    // 1) typing/status 표시
    await interaction.deferReply();

    const question = interaction.options.getString("내용");

    // 2) 최신 로그 수집 (deferReply() 후, but editReply 이후에도 덮어쓰기를 할 예정)
    await collectRecentMessagesForChannel(interaction.client, interaction.channel.id);

    // 3) 로그 파일 읽어서 recentLogs 구성
    const logFile = getLogFileNameByChannel(interaction.channel.id, interaction.channel.name);
    let recentLogs = [];
    if (fs.existsSync(logFile)) {
      const allLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));

      // 빈 embed 자리표시자(bot + embeds.length === 0)만 걸러내기
      const filtered = allLogs.filter((msg) => !msg.isBot || (Array.isArray(msg.embeds) && msg.embeds.length > 0));

      recentLogs = filtered.slice(-HISTORY_LENGTH);
    }

    // 4) 멀티턴 프롬프트 메시지 배열 생성
    const messages = [];
    for (const msg of recentLogs) {
      if (msg.isBot && msg.embeds && msg.embeds.length > 0) {
        const embed = msg.embeds[0];
        const userQ = embed.description || "";
        const botA = embed.fields?.[0]?.value || "";
        messages.push({ role: "user", content: userQ });
        messages.push({ role: "assistant", content: botA });
      } else {
        messages.push({ role: "user", content: msg.content });
      }
    }
    messages.push({ role: "user", content: question });

    // 5) OpenAI 호출
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
    });
    const answer = completion.choices[0]?.message?.content || "답변을 생성하지 못했습니다.";

    // 6) Embed 생성 & 채널에 전송
    const replyEmbed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setAuthor({
        name: `${interaction.user.username}님의 질문`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle("질문 내용")
      .setDescription(question)
      .addFields({ name: "AI 답변", value: answer })
      .setTimestamp();

    // editReply 로 반환된 Message 객체를 받아옵니다.
    const replyMsg = await interaction.editReply({ embeds: [replyEmbed] });

    const raw = replyMsg.embeds[0];
    const newEmbedData = {
      author: raw.author?.name || null,
      title: raw.title || null,
      description: raw.description || null,
      fields: raw.fields?.map((f) => ({ name: f.name, value: f.value })) || [],
      footer: raw.footer?.text || null,
    };

    // 7) 로그 파일에도 바로 덮어쓰기 (deferReply 자리표시자 대체)
    if (fs.existsSync(logFile)) {
      // 1) 읽어서
      const logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));

      // 2) 해당 메시지(id) 항목 찾고
      const idx = logs.findIndex((m) => m.id === replyMsg.id);
      if (idx !== -1) {
        // 3) 그 항목의 embeds 필드만 교체
        logs[idx].embeds = [newEmbedData];
      }

      // 4) 다시 쓰기
      fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), "utf-8");
    }
  },
};
