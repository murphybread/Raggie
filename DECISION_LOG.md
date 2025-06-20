프로젝트: RAG 기반 디스코드 Q&A 봇

문서 목적: LLM 플랫폼 선정에 대한 의사결정 과정 기록

최종 결정일: 2025년 6월 20일

## 1. 프로젝트 개요

- **목표:** 디스코드 채널에 축적된 대화 내용과 추가 문서를 기반으로, 팀원의 질문에 실시간으로 답변하는 Q&amp;A 봇을 개발한다.
- **사용자:** 20명 이하의 소규모 개발자 및 기획자 팀
- **주요 기능:** 기술 스택 추천, 과거 의사결정 내용 요약, 특정 주제에 대한 논의 과정 검색 등

## 2. 기술 스택 선정

- **핵심 요건:** LLM(언어 모델)과 Embedding(텍스트 벡터화) 기능을 단일 플랫폼에서 해결하여 개발 및 운영의 복잡성을 최소화한다.
- **최종 후보:** Google Gemini 플랫폼 vs OpenAI 플랫폼

## 3. 핵심 고려사항 및 최종 비교

|   |   |   |   |
|---|---|---|---|
|**비교 항목**|**Google Gemini 플랫폼**|**OpenAI 플랫폼**|**선택 이유**|
|**비용 효율성**|AI Studio는 무료지만 생산용으론 부적합. [Vertex AI의 `Gemini Embedding`은 $0.15/1M 토큰](https://www.google.com/search?q=%5Bhttps://cloud.google.com/vertex-ai/pricing)으로](https://www.google.com/search?q=https://cloud.google.com/vertex-ai/pricing)%EC%9C%BC%EB%A1%9C) 상대적으로 높음.|**[저렴한 경량 모델](https://openai.com/api/pricing/)** 존재. **[`text-embedding-3-small`은 $0.02/1M 토큰](https://www.google.com/search?q=%5Bhttps://openai.com/api/pricing/)**으로](https://www.google.com/search?q=https://openai.com/api/pricing/)**%EC%9C%BC%EB%A1%9C) 압도적으로 저렴.|소규모 프로젝트에 최적화된 비용 구조.|
|**RAG 성능/편의성**|[Vertex AI Search](https://www.google.com/search?q=https://cloud.google.com/vertex-ai/docs/generative-ai/rag/overview)를 통해 강력한 검색 기능 제공. 단, 직접 RAG 파이프라인 구축 필요.|**[Assistants API의 File Search 기능](https://platform.openai.com/docs/assistants/tools/file-search)**이 RAG 파이프라인을 자동화. **1GB 벡터 스토리지 무료 제공.**|압도적인 개발 편의성으로 시간과 노력 절약.|
|**운영 안정성**|[AI Studio](https://ai.google.dev/)는 SLA 미보장으로 운영 안정성 낮음. Vertex AI는 상용 등급으로 안정적.|API가 성숙하고 안정적이며, 상용 등급의 SLA 보장.|팀이 의존하는 툴로서 안정성 확보.|
|**데이터 프라이버시**|AI Studio는 데이터 수집. [Vertex AI는 데이터 프라이버시 보장](https://www.google.com/search?q=https://cloud.google.com/vertex-ai/docs/generative-ai/data-privacy).|[유료 API는 고객 데이터를 학습에 사용하지 않음](https://openai.com/enterprise-privacy).|팀 내부의 민감한 정보를 안전하게 보호.|

## 4. 주요 논의 과정 요약

본 프로젝트의 기술 스택을 선정하는 과정에서 다음과 같은 핵심적인 논의 및 검증 과정이 있었습니다.

### 4.1. '무료'의 함정 발견

초기에는 Google의 `embedding-004` 모델이 [무료라는 점](https://ai.google.dev/gemini-api/docs/pricing)에서 Gemini 플랫폼이 유력하게 검토되었습니다. 하지만 이는 **실험용 환경인 `AI Studio`에만 국한**되며, 실제 서비스 운영에는 데이터 프라이버시, 안정성(SLA 부재), 사용량 제한 등으로 인해 부적합하다는 결론을 내렸습니다.

### 4.2. Google 임베딩 가격 혼선 명확화

플랫폼 간 정확한 비용 비교를 위해 Google Vertex AI의 임베딩 가격을 심층적으로 확인했습니다.

- **최신 'Gemini Embedding' 모델 가격 확인:** 실제 상용 환경인 [Vertex AI의 가격표](https://cloud.google.com/vertex-ai/pricing)를 확인한 결과, 최신 `Gemini Embedding` 모델의 가격은 100만 토큰당 **$0.15**임을 확인했습니다. 이는 OpenAI의 가성비 모델(`small`, $0.02) 대비 **7.5배**, 고성능 모델(`large`, $0.13)보다도 비싼 가격입니다.
- **구형 모델 및 가격 단위 비교 제외:** 동일한 가격표에 있는 `글자(character)` 단위로 과금되는 구형 임베딩 모델(`Excluding Gemini Embedding`)은, 최신 기술이 아닐뿐더러 '토큰' 단위로 과금되는 OpenAI와 직접적인 비교가 어려워 평가 대상에서 제외했습니다.

### 4.3. 총 소유 비용(TCO) 관점 채택

단순 API 단가 비교를 넘어, **개발 시간, 운영 공수, 리스크**를 포함한 총체적 비용 관점에서 플랫폼을 재평가했습니다. 그 결과, OpenAI의 `Assistants API`가 제공하는 개발 편의성은 RAG 파이프라인 구축에 필요한 개발팀의 시간과 노력을 크게 절약해주므로, 실질적인 비용 절감 효과가 매우 크다고 판단했습니다.

## 5. 최종 결정: OpenAI

**상기된 모든 논의를 바탕으로, 본 프로젝트의 LLM/임베딩 플랫폼으로 OpenAI를 최종 선정합니다.**

- **핵심 사유:**
    1. **압도적인 개발 편의성:** `Assistants API`가 RAG 개발의 복잡성을 제거해 빠른 프로토타이핑과 안정적인 운영을 가능하게 합니다.
    2. **명확한 비용 우위:** 최신 모델 기준, 임베딩 비용이 Google 대비 최대 7.5배 저렴하며, `1GB 무료 벡터 스토리지` 제공으로 초기 비용 부담이 없습니다.
    3. **검증된 안정성과 생태계:** 상용 등급의 안정적인 API와 데이터 프라이버시 정책은 팀이 믿고 사용할 수 있는 툴의 기반이 됩니다.

