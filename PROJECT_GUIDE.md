# Scroll the Buddhist Texts — 통합 개발계획·단계별 설계지침·바이브 코딩 실행 프롬프트 v1.1

- 작성 기준: 2026-11-26
- 문서 유형: 제품 기획서(PRD), 기술 설계서, 콘텐츠 정책, QA 기준 및 AI 개발 에이전트 실행 지침 통합본
- 적용 환경: Google Antigravity, Codex 등 바이브 코딩 환경
- 프로젝트명: Scroll the Buddhist Texts (가칭 마음스크롤 / Dharma Scroll)
- 슬로건: 스크롤할수록 마음이 맑아지는 시간
- 지원 환경: Expo React Native TypeScript (Android 우선, iOS 확장, 웹 어댑터)

## 핵심 요약
1. **제품 목표**: 세로 스와이프 습관을 경전 읽기·이해·사유·실천으로 전환 (`SCROLL -> UNDERSTAND -> REFLECT -> PRACTICE -> RETURN`).
2. **화면 구조**: 하단 5탭 (`홈` / `경전` / `수행` / `저장` / `My`), 비회원 즉시 이어 읽기.
3. **디자인 토큰**:
   - 라이트 배경 `#F7F4EC`, 카드 `#E9EDE2`, 주요색 `#314C40`, 보조 `#91A28D`, 장식 `#C5A26A`, 본문 `#243B30`, 보조 텍스트 `#526756`
   - 다크 배경 `#19221F`
   - 글자 크기 5단계: `18 / 21 / 24 / 28 / 34sp`
4. **콘텐츠 및 권리 원칙**:
   - `rights-manifest`에서 `status === "approved"` 및 기능별 권리(`allowRedistribution`, `allowCommercial`, `allowAdaptation`, `allowShare`, `allowTTS`, `allowAIProcessing`) 검증.
   - 미승인/권리 누락 시 운영 패키지 빌드 차단 (`scripts/validate-content.ts`).
   - 허가 미확보 시 테스트 전용 합성/시연 문장(`fixture`)만 사용하며 운영 데이터로 배포하지 않음.
5. **아키텍처**:
   - `app/` (Expo Router), `src/components/`, `src/features/`, `src/domain/`, `src/data/`, `src/services/`, `assets/content/`, `scripts/`, `tests/`, `docs/`.
   - 공개 경전 DB와 개인 데이터 DB 분리, NFC 정규화, 안정적 `segment_id` 유지.
6. **단계별 게이트 (0~8단계)**:
   - 0: 기획, 문서, 스키마, 권리 검증기, CI
   - 1: 5탭 UI, 세로 스냅 피드, 이전/다음, 장문 읽기, 5단계 글씨, 접근성
   - 2: SQLite/웹 어댑터, 마이그레이션, 번역 전환, 위치 복원, 오프라인
   - 3: 부분 검색(NFC), 하이라이트, 북마크, 메모 CRUD, 태그, 권리 기반 공유
   - 4: 경전 탐구(해설/배경/원어/관련경전/교리/실천), 미검수 미노출
   - 5: 7/30/100일 읽기 계획, 중복 방지 읽기 이벤트, 자정 경계, OS TTS, 백업/삭제
   - 6: 선택형 RAG AI 심화 탐구(인용 ID·근거 검증, 프롬프트 인젝션 방어, 비용 상한, 50+ 평가셋)
   - 7: 10,000단락/500회 이동 성능·회귀 테스트, EAS Build 설정, 스토어/개인정보 문서
   - 8: 독립 기능 플래그 기반 확장(동기화, 프리미엄 안내, 공개 댓글 신고/차단)
