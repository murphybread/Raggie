import { OpenAI } from "openai";
import { EmbedBuilder } from "discord.js";
import fs from "fs";

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
    await interaction.deferReply();
    const question = interaction.options.getString("내용");

    // 동적으로 logCollector import
    const { getLogFileNameByChannel, collectRecentMessagesForChannel } = await import("../utils/logCollector.js");

    // 실시간 로그 수집
    await collectRecentMessagesForChannel(interaction.client, interaction.channel.id);

    // 로그 파일 읽기
    const logFile = getLogFileNameByChannel(interaction.channel.id, interaction.channel.name);
    let recentLogs = [];
    if (fs.existsSync(logFile)) {
      const allLogs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
      recentLogs = allLogs.slice(-HISTORY_LENGTH);
    }

    // 멀티턴 프롬프트: OpenAI messages 배열로 변환
    const messages = [];
    for (const msg of recentLogs) {
      if (msg.isBot && msg.embeds && msg.embeds.length > 0) {
        // 이전 AI 답변
        const embed = msg.embeds[0];
        const originalQuestion = embed.description || "";
        const botAnswer = embed.fields?.[0]?.value || "";
        messages.push({ role: "user", content: originalQuestion });
        messages.push({ role: "assistant", content: botAnswer });
      } else {
        // 일반 사용자 메시지
        messages.push({ role: "user", content: msg.content });
      }
    }
    // 마지막에 현재 질문 추가
    messages.push({ role: "user", content: question });

    // OpenAI 호출
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages,
    });
    const answer = completion.choices[0]?.message?.content || "답변을 생성하지 못했습니다.";

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setAuthor({ name: `${interaction.user.username}님의 질문`, iconURL: interaction.user.displayAvatarURL() })
      .setTitle("질문 내용")
      .setDescription(question)
      .addFields({ name: "AI 답변", value: answer })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
