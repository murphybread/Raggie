import { OpenAI } from "openai";
import { EmbedBuilder } from "discord.js";
import "dotenv/config";

export default {
  // 1. 명령어 정의 부분
  data: {
    name: "검색",
    description: "Vector Store의 지식을 기반으로 질문에 답변합니다.",
    options: [
      {
        name: "내용",
        type: 3, // String 타입
        description: "검색할 내용",
        required: true,
      },
    ],
  },

  // 2. 명령어 실행 로직
  async execute(interaction) {
    // OpenAI API는 시간이 걸릴 수 있으므로 '응답 대기 중' 상태로 전환
    await interaction.deferReply();

    // .env 파일에서 Vector Store ID 가져오기
    const vectorStoreId = process.env.VECTOR_STORE_ID;
    const K_RESULT = 5; // 검색할 최대 결과 수

    // Vector Store ID가 설정되지 않았을 경우 사용자에게 안내하고 종료
    if (!vectorStoreId) {
      console.error("오류: .env 파일에 VECTOR_STORE_ID가 설정되지 않았습니다.");
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000) // 빨간색
        .setTitle("봇 설정 오류")
        .setDescription("봇 관리자에게 문의하세요. Vector Store가 제대로 설정되지 않았습니다.");
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // 사용자가 입력한 질문
    const question = interaction.options.getString("내용");

    try {
      // OpenAI 클라이언트 초기화
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // OpenAI Responses API 호출 (RAG)
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: question,
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            max_num_results: K_RESULT,
          },
        ],
      });

      // 답변 추출
      const answer = response.output_text || "답변을 생성하지 못했습니다. 다른 방식으로 질문해보세요.";

      // 결과를 Discord Embed 형식으로 꾸미기
      const embed = new EmbedBuilder()
        .setColor(0x0099ff) // 파란색
        .setAuthor({ name: `${interaction.user.username}님의 검색`, iconURL: interaction.user.displayAvatarURL() })
        .setTitle("검색어")
        .setDescription(question)
        .addFields({ name: "AI 답변", value: answer })
        .setTimestamp()
        .setFooter({ text: "Powered by OpenAI Vector Store" });

      // 최종 답변 전송
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      // API 호출 등 과정에서 에러 발생 시 처리
      console.error("OpenAI RAG API 호출 중 오류 발생:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("오류 발생")
        .setDescription("AI 답변을 가져오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
