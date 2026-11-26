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
- 풀스크린 세로 스크롤 레이아웃 개편: 상단 플로팅 투명 내비게이션(순차/주제/판본 + 검색), 좌하단 경전·해설/원문 링크 오버레이, 우측 액션 레일(경전 배지/원문 토글, 찜, 해설, 기록, 전달, 바이럴 카드, 낭독 디스크) 및 SNS 공유용 `ViralShareModal`(PNG 카드 저장/문구 복사/전달) 추가, 하단 5탭 중앙 수행 강조 바 적용.
- 무료/오픈 라이선스 경전 대폭 확충(`scripts/import-open-scriptures.ts`, `assets/content/open-scriptures.json`): 9개 문헌·18개 판본·775개 구절·1,550개 본문 수록(금강경 32분 완역·반야심경·천수경 한국어+한문, 법구경 423게송 완역·소송경 9편·초전법륜경·숫타니파타 73경·여시어경 112경·우다나 80경 팔리어+CC0 영어) 및 `--production` 빌드 검증 100% 통과.
- 주소창/브라우저 메뉴 없는 전체화면 앱 실행 지원: PWA 매니페스트(`public/manifest.webmanifest` `display: standalone`), 서비스 워커(`public/sw.js`), iOS/Android `apple-mobile-web-app-capable`/`viewport-fit=cover` 메타태그 및 `100dvh` 처리(`scripts/prepare-web-pwa.ts`), 웹 전체화면 토글 및 네이티브 translucent status bar 설정.
- 한국어/영어 단일 언어 통일 및 WebAPK 풀스크린·레이아웃 보완:
  - `public/manifest.webmanifest` `id`/`start_url`/`scope`를 `/`로 통일하고 `display: "fullscreen"` 및 `display_override: ["fullscreen", "standalone"]` 적용, `any`/`maskable` 아이콘 분리, `app/+html.tsx`에 매니페스트·전체화면 메타태그 직접 삽입 및 `vercel.json` 매니페스트 `Cache-Control: max-age=0, must-revalidate` 보완 (`dharma-scroll-shell-v2`).
  - `VerseCard` 우측 액션 레일에 상단 바 높이 기준 여백(`top: topInset + 56`)과 컴팩트 반응형 축소 레이아웃을 적용해 작은 화면에서도 상단 검색 아이콘과 겹치지 않도록 개선.
  - 영어 위키문헌 퍼블릭 도메인(CC0/PD-author-release) 금강경 32분 및 반야심경 영어 판본 추가(`20개 판본 · 1,591개 본문`), 전 화면·탭·모달·검색·읽기 계획·해설·공유·TTS에 한국어(`ko`) / 영어(`en`) 일관 전환 적용.
  - Android WebAPK(`"display": "standalone"`, `vercel.json` 정적 PWA 경로 rewrite 제외, `sw.js` `v3`, `<head>` 레벨 `beforeinstallprompt` 전역 캡처 및 1탭 `앱으로 설치하기` 배너)와 `360px` 상단/하단 여백 보완 완료.
  - 바이블 앱 레퍼런스 기반 UI/UX 전면 개편: 따뜻한 양피지·화이트 카드(`#F5F2EB` / `#FFFFFF` / `#C95B4B`) 디자인 시스템, `오늘(Today)` 대시보드(커스텀 일러스트·여정 카드·탐구 길 안내·저장/일지 요약), 미니멀 `스크롤(Scroll)` 리더(`KOR/ENG`·테마·장/경전 선택 시트·우측 원형 액션·진행률 링·하단 스와이프 유도·`더 깊이 알아보기`), 4탭 하단 내비게이션(`오늘`, `읽기 계획`, `스크롤`, `서재`) 및 가부좌 참선 불상(흰색 배경) 앱 아이콘 적용.
