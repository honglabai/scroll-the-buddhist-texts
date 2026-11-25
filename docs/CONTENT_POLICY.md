# CONTENT_POLICY — 경전 콘텐츠·권리·검수 정책

## 1. 기본 원칙
1. **기본값 차단(Deny by Default)**: `rights-manifest`에서 `status === "approved"`가 아닌 판본은 운영 빌드에 포함하지 않는다.
2. **원문·번역·의역·해설·AI 분리**:
   - 원문(팔리어/산스크리트어/한문)과 한국어 번역, 쉬운 의역, 검수된 해설, AI 생성 응답을 별도 필드/테이블에 저장하고 UI에서도 명확히 구분한다.
   - AI 초벌 번역이나 미검수 해설(`review_status !== "approved"`)은 운영 화면에 노출하지 않는다.
3. **출처 및 전통 존중**:
   - SuttaCentral, Bilara Data, 동국대 불교학술원, CBETA 등 출처별 이용 조건(상업적 이용, 재배포, 공유, TTS, AI 처리)을 개별 판본 단위로 기록한다.
   - 초기불교(니까야)와 대승경전, 한국 찬술 문헌의 전통·판본 차이를 명시하며 임의로 혼합하지 않는다.
4. **시연/테스트 문장**:
   - 정식 라이선스 확보 전에는 합성/시연 전용 데이터(`isSyntheticTestFixture: true` 또는 테스트 환경 전용)만 사용하며, 운영 빌드에는 승인된 콘텐츠만 포함되도록 `scripts/validate-content.ts`가 차단한다.

## 2. Rights Manifest 필수 스키마
- `workId`, `editionId`, `translator`, `sourceUrl`, `sourceRevision`, `license`, `permissionEvidence`
- `allowRedistribution`, `allowCommercial`, `allowAdaptation`, `allowShare`, `allowTTS`, `allowAIProcessing`
- `reviewedAt`, `reviewer`, `status` (`approved` | `pending` | `denied` | `unknown`)
