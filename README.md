# 마음스크롤 · Dharma Scroll (`Scroll the Buddhist Texts`)

> 스크롤할수록 마음이 맑아지는 시간 — 광고와 로그인 없이 한 구절씩 읽고 사유하는 불교 경전 읽기 앱

## 핵심 특징
- **세로 스냅 피드**: 한 게송 또는 의미 단락 단위로 부드럽게 이동하는 읽기 경험(이전/다음 버튼, 웹 키보드 `↑`/`↓`, 장문 내부 스크롤 및 전체 읽기 모달 지원)
- **비회원·오프라인 우선**: `expo-sqlite` 기반 공개 경전 DB와 개인 비공개 DB 분리, 웹 어댑터 지원
- **권리·검수 게이트**: `rights-manifest` 스키마 검증(`npm run validate:content`)을 통해 미승인 판본 및 미검수 해설 노출 차단
- **검색·저장·기록·공유**: NFC 한글 부분 검색, 북마크 모음 폴더, 비공개 수행 일지 CRUD, 권리 조건(`allowShare`) 기반 공유
- **경전 탐구·수행·음성**: 쉬운 해설·배경·원어·평행경/주제 관련 구절, 7/30/100일 읽기 계획, 3분 호흡 타이머, `allowTTS` 기반 OS TTS 낭독
- **선택형 RAG AI 심층 탐구**: 승인 코퍼스 근거 검증, 인용 ID 검증, 프롬프트 인젝션 방어, 비용/길이 상한 적용
- **접근성 및 백업**: 글자 크기 5단계(`18~34sp`), 고딕/명조 글꼴, 줄 간격 3단계, 라이트/다크/시스템 테마, 모션 감소, JSON 내보내기·복원·전체 삭제

## 검증 명령
```bash
npm run typecheck
npm run lint
npm run validate:content
npm test
npm run build:web
```

## 문서
- [PROJECT_GUIDE.md](./PROJECT_GUIDE.md)
- [AGENTS.md](./AGENTS.md)
- [docs/PRD.md](./docs/PRD.md)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/CONTENT_POLICY.md](./docs/CONTENT_POLICY.md)
- [docs/TEST_PLAN.md](./docs/TEST_PLAN.md)
- [docs/PRIVACY_POLICY.md](./docs/PRIVACY_POLICY.md)
- [docs/CHANGELOG.md](./docs/CHANGELOG.md)
