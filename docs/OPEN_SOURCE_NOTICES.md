# 오픈소스 및 저작권·이미지 출처 안내 (Open Source & Attribution Notices)

본 앱(`마음스크롤 · Dharma Scroll`)에 수록된 모든 경전 텍스트, 현대어 초안 및 시각 아트워크는 권리 정책(`docs/CONTENT_POLICY.md`)과 `rightsManifest` 검수를 거쳐 포함됩니다.

## 1. 불교대전 (`work-bulgyodaejeon`) 코퍼스 안내
- **원전**: 만해 한용운(1879–1944) 편찬 『불교대전(佛敎大典)』(1914년 초판, `PD-old-100`)
- **현대어·영어 본문 분리 원칙**:
  - `ed-bulgyodaejeon-lzh`: 1914년 초판 원문 (`isOriginal: true`, `PD-old-100`)
  - `ed-bulgyodaejeon-ko`: `Bulgyodaejeon DB v1.0` 기반 독자 현대어 번역(`text`) 및 앱용 짧은 사유 문장(`paraphrase`) 분리 수록 (기존 현대 출판 번역 미복제, `1914 원문 기반 의역 초안` 표기)
  - `ed-bulgyodaejeon-en`: 60편 전체 영어 번역(`text`) 및 짧은 영문 의역(`paraphrase`)
  - 각 항목에는 인용 경전명·인쇄면 쪽수(`불교대전 N쪽`)·화자 구분(`speaker_candidate`, 예: 부처님 말씀 / 논서의 설명)을 분리해 병기합니다.
- **미번역 OCR 후보 데이터 제외**: 검수·번역이 완료된 60개 항목(제1품 서품 37건 · 제2품 교리강령품 23건)만 선별 적재하며, 원시 SQLite 파일 및 미번역 OCR 후보 블록은 클라이언트 번들에 포함하지 않습니다.

## 2. 오픈 경전 텍스트 출처 (`assets/content/open-scriptures.json`)
- **금강경 (`work-diamond`, 32분)** / **반야심경 (`work-heart`, 9단락)**: 한국어 위키문헌(`PD-자작` / `PD-old-100`) 및 영어 퍼블릭 도메인 판본
- **천수경 (`work-cheonsu`, 23절)**: 한국어 위키문헌(`CC-BY-SA-4.0`) 및 한문 원문(`PD-old-100`)
- **법구경 (`work-dhp`, 423게송)** / **소송경 (`work-kp`, 9편)** / **초전법륜경 (`work-sn56-11`, 14단락)** / **숫타니파타 (`work-snp`, 73경)** / **여시어경 (`work-iti`, 112경)** / **우다나 (`work-ud`, 80경)**: SuttaCentral Bilara (`CC0` 팔리어 원문 및 영어 번역)

## 3. 카드 및 배경 아트워크 라이선스 (`src/components/pageArtworks.ts`)
- `bd-buddha.jpg`: Buseoksa Seated Buddha (`CC0`)
- `bd-candle.jpg`: A Candle in the Dark (`CC BY-SA 3.0`)
- `bd-moon.jpg`: Moon and the Lake (`CC BY-SA 4.0`)
- `bd-river.jpg`: Mist & Peaks at River (`CC BY-SA 3.0`)
- `page-library.jpg`: Jeong Seon · Geumgangjeon (`Public Domain`)
- `page-my.jpg`: Kim Hong-do · Yeombulseoseungdo (`Public Domain`)
- `page-saved.jpg` / `page-bell.jpg`: An Gyeon · Autumn Moon & Temple / Evening Bell at Misty Temple (`CC0`)
- `journey-hero.jpg` / `ways-plans.jpg` / `ways-topics.jpg`: 앱 전용 사경 일러스트 아트워크 (`Curated Temple Dawn Art` / `Curated Lotus Courtyard Art` / `Curated Bamboo Grove Art`)
