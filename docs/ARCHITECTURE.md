# ARCHITECTURE — Scroll the Buddhist Texts

## 1. 기술 스택
- **프레임워크**: Expo (SDK 58) + React Native + TypeScript
- **네비게이션**: Expo Router (`app/(tabs)/` + 모달/상세 라우트)
- **로컬 데이터**:
  - 네이티브(Android/iOS): `expo-sqlite` (공개 경전 DB `scripture.db`와 개인 데이터 DB `personal.db` 분리)
  - 웹/테스트: 메모리 및 `IndexedDB` 어댑터 (네이티브 SQLite FTS 가정 금지)
- **음성**: `expo-speech` (허용 판본만 지원, 앱 백그라운드/종료 시 정지)
- **알림**: `expo-notifications` (선택적 로컬 알림, 중복 방지)
- **공유**: React Native `Share` / `expo-sharing` (권리 플래그 확인 후 본문 또는 출처 링크만 공유)

## 2. 디렉터리 구조
```text
app/                # Expo Router 화면 (tabs, study, search, reader)
src/
  components/       # VerseCard, SourceLabel, BottomBar, ThemeTokens
  features/         # reader, library, study, journal, plans, settings, ai, extensions
  domain/           # types, reading rules, licenses, featureFlags
  data/             # repository interfaces, sqlite/native, web/memory adapters, migrations
  services/         # share, tts, notifications, sync, ai
assets/
  content/          # approved seed packs + rights manifest
scripts/            # validate-content.ts, import/normalize/package scripts
tests/              # unit, integration, e2e-performance
docs/               # PRD, ARCHITECTURE, CONTENT_POLICY, TEST_PLAN, CHANGELOG, ...
```

## 3. 데이터 모델 및 생명주기 분리
- **공개 경전 데이터**: `works`, `editions`, `sections`, `segments`, `segment_texts`, `segment_alignment`, `licenses`, `annotations`, `related_links`
- **개인 데이터(로컬 비공개 기본)**: `bookmarks`, `notes`, `reading_progress`, `reading_events`, `plans`, `plan_items`, `plan_progress`, `settings`
- **안정성 규칙**:
  - 모든 `segment_id`는 판본/콘텐츠 업데이트에도 불변 유지, 일대다/다대일 매핑은 `segment_alignment`에 기록
  - 트랜잭션 마이그레이션 적용, 업데이트 시 개인 데이터 파괴적 초기화 금지
  - Unicode NFC 정규화 적용
