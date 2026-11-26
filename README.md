# 마음스크롤 · Dharma Scroll (`Scroll the Buddhist Texts`)

> 스크롤할수록 마음이 맑아지는 시간 — 광고와 로그인 없이 한 구절씩 읽고 사유하는 불교 경전 읽기 앱

## 주요 특징
- **풀스크린 세로 스와이프 쇼츠(Shorts/Reels) 리더 & 우측 액션 레일**: 상단 다크 플로팅 내비게이션(`KOR/ENG`, 테마, 배경 그림, 경전/구절 시트), 상단 주제별 아트워크 + 중앙 말씀·출처 카드, 하단 `위로 스와이프` 유도 및 우측 세로 바이럴·수행 액션 레일(`찜`, `기록`, `낭독`, `원문`, `공유`, `%` 링), 하단 4탭 메뉴(`오늘`, `읽기 계획`, `스크롤`, `서재`)
- **주소창 없는 전체화면 앱(PWA) 지원**: `manifest.webmanifest`(`display: standalone`), 서비스 워커(`sw.js`), iOS/Android `viewport-fit=cover`·`apple-mobile-web-app-capable`, 웹 전체화면 API 토글 지원
- **무료/오픈 라이선스 경전 10종(835개 구절 · 23개 판본) 수록** (`assets/content/open-scriptures.json`, 상세 출처: `docs/OPEN_SOURCE_NOTICES.md`)
  - **불교대전 (만해 한용운 · 1914)** 60편 핵심 말씀: 한국어 현대어 번역/의역(`PD-old-100`) + 영어(`PD-old-100`) + 1914년 한문 원문(`PD-old-100`) — Bulgyodaejeon DB v1.0 (`제1품 서품 · 제2품 교리강령품`)
  - **금강경 (금강반야바라밀경)** 32분 완역: 한국어(`PD-자작`) + 한문 원문(`PD-old-100`) — 한국어 위키문헌
  - **반야심경 (반야바라밀다심경)** 9단락 전문: 한국어(`PD-자작`) + 한문 원문(`PD-old-100`) — 한국어 위키문헌
  - **천수경 (대비심대다라니경)** 23절 전문: 한국어 독송(`CC-BY-SA-4.0`) + 한문(`PD-old-100`) — 한국어 위키문헌
  - **법구경 (Dhammapada)** 423게송 완역: 팔리어 원문(`CC0`) + Bhikkhu Sujato 영어(`CC0`) — SuttaCentral Bilara
  - **소송경 (Khuddakapāṭha, 자애경·보배경·행복경 등)** 9편 완역: 팔리어(`CC0`) + 영어(`CC0`)
  - **초전법륜경 (SN 56.11)** 14단락 전문: 팔리어(`CC0`) + 영어(`CC0`)
  - **숫타니파타 (Sutta Nipāta)** 73경 완역: 팔리어(`CC0`) + 영어(`CC0`)
  - **여시어경 (Itivuttaka)** 112경 완역: 팔리어(`CC0`) + 영어(`CC0`)
  - **우다나 · 감흥어경 (Udāna)** 80경 완역: 팔리어(`CC0`) + 영어(`CC0`)
- **비회원·오프라인 우선**: `expo-sqlite` 공개/개인 DB 분리, NFC 검색, 북마크·비공개 메모 CRUD, 읽기 계획, TTS, JSON 백업/복원/전체 삭제

## 검증 명령
```bash
npm run typecheck
npm run lint
npm run validate:content
npx tsx scripts/validate-content.ts --production
npm test
npm run build:web
```
