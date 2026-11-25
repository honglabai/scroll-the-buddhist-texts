# CHANGELOG

## [0.1.0] - 2026-11-26 (Stage 0 ~ Stage 8 통합 구축)
### Added
- **단계 0**: `PROJECT_GUIDE.md`, `AGENTS.md`, `docs/`(PRD, ARCHITECTURE, CONTENT_POLICY, TEST_PLAN, PRIVACY_POLICY, STORE_LISTING, OPEN_SOURCE_NOTICES), 권리 Manifest JSON Schema(`src/domain/rights-manifest.schema.json`), 권리 검증기(`scripts/validate-content.ts`), 합성 테스트 데이터 및 시연용 fixture(`demo-001`~`demo-003`), CI 워크플로(`.github/workflows/ci.yml`), `.env.example`.
- **단계 1**: 디자인 토큰(`#F7F4EC`, `#314C40`, `#91A28D`, `#C5A26A`, `#19221F` 등), 5단계 글자 크기(18/21/24/28/34sp), 모션 감소/접근성 라벨/48dp 터치 영역, 5탭(`홈`, `경전`, `수행`, `저장`, `My`), 세로 스냅 피드(`FlatList`), 이전/다음 버튼, 장문 내부 스크롤 모달, 경전 끝 완료 화면.
- **단계 2**: 도메인 모델 및 Repository 인터페이스, `expo-sqlite` 마이그레이션(공개 경전 DB & 개인 DB 논리/물리 분리) 및 웹/테스트 어댑터, NFC 정규화, 오프라인 읽기, 재실행 위치 복원, 번역 전환 시 동일 `segment_id` 유지 및 미지원 판본 안내, 콘텐츠 업데이트 매핑(`segment_alignment`).
- **단계 3**: 경전명/구절번호/한글 본문 부분 검색 및 하이라이트, 정확한 구절 위치 이동, 북마크 중복 방지, 비공개 메모 CRUD 및 태그, 권리(`allowShare`) 기반 OS 공유(텍스트/출처 링크 분리).
- **단계 4**: 경전 탐구 모달/화면(쉬운 이해, 경전 배경, 원어 탐구, 관련 경전[평행경 vs 주제 유사 구분], 교리적 의미, 오늘의 실천), 미검수(`review_status !== 'approved'`) 비노출 및 빈 상태 안내.
- **단계 5**: 7/30/100일 읽기 계획, 자정 경계 및 노출시간 기반 읽기 이벤트 중복 방지, 수동 완료, 허용 판본(`allowTTS`) OS TTS 낭독(속도/중지/백그라운드 정지), 로컬 JSON 백업/복원 및 전체 개인 데이터 삭제.
- **단계 6**: 선택형 RAG AI 심화 탐구 서비스(승인 코퍼스 검색, `allowAIProcessing` 필터링, 인용 ID·근거 검증기, 프롬프트 인젝션 방어, 입력 길이/요청/비용 상한, 개발용 모의 응답, 50개 이상 평가셋 검증).
- **단계 7**: 10,000단락 생성 및 500회 이동 성능/회귀 테스트, `eas.json` 내부/테스트 빌드 설정, 스토어 및 개인정보 문서.
- **단계 8**: 독립 기능 플래그(`sync`, `premium`, `publicComments`) 기반 확장 모듈(선택 동의 동기화, 구독 안내/복원 UI, 댓글 신고/차단/필터).

### Improved (코드 검토 및 보완)
- `법구경` 시연 구절 순서를 실제 경전 게송 번호 순(`제1게송 -> 제2게송 -> 제5게송 -> 제183게송 -> 제223게송 -> 제368게송`)으로 정렬하고 `seedContent.ts` 타입 단언(`as never`) 제거.
- 저장 탭(`saved.tsx`) 및 경전 탐구(`StudyModal.tsx`)에서 타 경전 구절로 직접 이동(`navigateToSegmentById`) 및 구절 요약/모음 폴더 필터·인라인 일지 수정 추가.
- My 탭(`my.tsx`)에 본문 글꼴(고딕/명조), 줄 간격 3단계(1.35/1.55/1.80), 출처·권리 안내 모달, 개인정보 처리방침·오픈소스 고지 모달, JSON 백업 복원(`importPersonalData`) 구현.
- 홈 상단 연꽃 배지·설정 바로가기, 웹 키보드 상하 이동(`ArrowUp`/`ArrowDown`), `app/+html.tsx`(`lang="ko"`), `vercel.json` 및 `build:web` 스크립트 추가.
- Vercel SPA 하위 경로(`/library`, `/practice`, `/saved`, `/my`) 새로고침 404 방지를 위해 `vercel.json` rewrite 규칙(`/(.*) -> /index.html`) 및 HTML 캐시 헤더 보완.
