import type {
  Annotation,
  AppLanguage,
  Edition,
  ReadingPlan,
  RelatedLink,
  Segment,
  Work,
} from '../domain/types';

export interface AppStrings {
  appName: string;
  appShort: string;
  tabs: {
    home: string;
    library: string;
    practice: string;
    saved: string;
    my: string;
  };
  home: {
    sequential: string;
    topic: string;
    edition: string;
    loading: string;
    errorTitle: string;
    emptyFeed: string;
    endTopic: (topic: string) => string;
    endWork: (workTitle: string) => string;
    endDesc: string;
    chooseNext: string;
    editionModalTitle: string;
    topicModalTitle: string;
    missingSegment: string;
    fullscreenEnter: string;
    fullscreenExit: string;
    fullscreenHint: string;
    shareRestrictedAlertTitle: string;
    shareRestrictedAlertBody: string;
  };
  card: {
    paraphrasePrefix: string;
    readFull: string;
    readFullClose: string;
    originalLabel: string;
    details: string;
    showOriginal: string;
    hideOriginal: string;
    prev: string;
    next: string;
    like: string;
    liked: string;
    study: string;
    note: string;
    forward: string;
    viral: string;
    ttsPlay: string;
    ttsStop: string;
    missingEditionText: string;
    syntheticBadge: string;
  };
  library: {
    title: string;
    searchPlaceholder: string;
    searchCount: (n: number) => string;
    noResults: string;
    unitLabel: (n: number) => string;
    traditions: {
      all: string;
      early_buddhism: string;
      mahayana: string;
      korean_treatise: string;
    };
  };
  practice: {
    title: string;
    subtitle: (count: number) => string;
    timerTitle: string;
    timerDesc: string;
    pause: string;
    restart: string;
    start: string;
    reset: string;
    plansTitle: string;
    daysUnit: string;
    startPlan: string;
    readDay: (day: number) => string;
    manualComplete: string;
    reminderLabel: string;
    reminderAlertTitle: string;
  };
  saved: {
    title: string;
    bookmarksTab: (n: number) => string;
    notesTab: (n: number) => string;
    allFolder: string;
    defaultFolder: string;
    emptyBookmarks: string;
    emptyNotes: string;
    folderLabel: (folder: string, date: string) => string;
    jumpToVerse: string;
    saveEdit: string;
    viewOriginal: string;
  };
  my: {
    title: string;
    languageTitle: string;
    koreanLabel: string;
    englishLabel: string;
    pwaTitle: string;
    pwaActive: string;
    pwaGuide: string;
    pwaInstallBtn: string;
    pwaGuideBtn: string;
    pwaToast: string;
    statsTitle: string;
    statRead: string;
    statSaved: string;
    statNotes: string;
    fontSizeTitle: (sp: number) => string;
    fontStyleAndLineTitle: string;
    sansLabel: string;
    serifLabel: string;
    lineNarrow: string;
    lineNormal: string;
    lineWide: string;
    themeTitle: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    reduceMotion: string;
    ttsSpeed: (rate: number) => string;
    sourcesTitle: string;
    sourcesBtn: (n: number) => string;
    privacyBtn: string;
    backupTitle: string;
    backupDesc: string;
    exportBtn: string;
    restoreBtn: string;
    wipeBtn: string;
    wipeConfirmTitle: string;
    wipeConfirmBody: string;
    cancel: string;
    confirmDelete: string;
    exportedMsg: string;
    restoredMsg: string;
    wipedMsg: string;
    restoreModalTitle: string;
    restorePlaceholder: string;
    restoreExecBtn: string;
    restoreFailTitle: string;
    sourcesModalTitle: string;
    privacyModalTitle: string;
    privacyHeading: string;
    privacyBody: string;
    ossHeading: string;
    permShare: string;
    permTts: string;
    permAi: string;
    allowed: string;
    restricted: string;
    translatorLabel: string;
    licenseLabel: string;
  };
  study: {
    title: string;
    bodyLabel: string;
    tabs: {
      easy: string;
      context: string;
      terms: string;
      related: string;
      practice: string;
      ai: string;
    };
    emptyAnnotations: string;
    emptyRelated: string;
    originalTitle: string;
    notePrefix: string;
    sourcePrefix: string;
    parallelBadge: string;
    thematicBadge: string;
    aiRestricted: string;
    aiPlaceholder: string;
    aiRun: string;
    aiRunning: string;
    aiBadgeMock: string;
    aiBadge: string;
    aiPracticePrefix: string;
    aiCitationsPrefix: string;
    aiMissingCorpus: string;
  };
  noteModal: {
    title: string;
    subtitleSuffix: string;
    bodyPlaceholder: string;
    tagsPlaceholder: string;
    saveBtn: string;
    updateBtn: string;
    existingTitle: (n: number) => string;
    empty: string;
    edit: string;
    del: string;
    unsavedTitle: string;
    unsavedBody: string;
    keepEditing: string;
    discard: string;
  };
  viralModal: {
    title: string;
    subtitle: string;
    presets: { hanji: string; forest: string; ink: string };
    restrictedBody: string;
    saveImage: string;
    shareCard: string;
    copyText: string;
    sendFriend: string;
    copiedMsg: string;
    savedImageMsg: string;
  };
  topics: Record<string, string>;
}

const KO_STRINGS: AppStrings = {
  appName: '마음스크롤',
  appShort: '마음스크롤',
  tabs: { home: '홈', library: '경전', practice: '수행', saved: '저장', my: 'My' },
  home: {
    sequential: '순차',
    topic: '주제',
    edition: '판본',
    loading: '경전을 불러오는 중...',
    errorTitle: '오류',
    emptyFeed: '표시할 경전 구절이 없습니다.',
    endTopic: (topic) => `${topic} 주제 읽기를 마쳤습니다`,
    endWork: (title) => `${title} 끝까지 읽었습니다`,
    endDesc: '잠시 숨을 고르며 오늘 마음에 남았던 구절을 떠올려 보세요.',
    chooseNext: '다음 경전 선택하기',
    editionModalTitle: '번역 및 원문 판본 선택',
    topicModalTitle: '주제별 읽기 선택',
    missingSegment: '해당 구절을 찾을 수 없습니다.',
    fullscreenEnter: '주소창 없이 전체 화면',
    fullscreenExit: '전체 화면 종료',
    fullscreenHint: '모바일 브라우저에서 "앱 설치" 또는 "홈 화면에 추가"를 누르면 주소창 없이 실행됩니다.',
    shareRestrictedAlertTitle: '전달 안내',
    shareRestrictedAlertBody: '이 판본은 원문 본문 공유가 제한되어 출처 정보만 전달되었습니다.',
  },
  card: {
    paraphrasePrefix: '쉬운 말',
    readFull: '전체 읽기 모드',
    readFullClose: '전체 읽기 닫기',
    originalLabel: '원문',
    details: '자세히',
    showOriginal: '원문 보기',
    hideOriginal: '원문 닫기',
    prev: '이전',
    next: '다음',
    like: '찜',
    liked: '찜함',
    study: '해설',
    note: '기록',
    forward: '전달',
    viral: '바이럴',
    ttsPlay: '낭독',
    ttsStop: '정지',
    missingEditionText: '선택한 판본의 본문이 준비되지 않았습니다.',
    syntheticBadge: '시연용',
  },
  library: {
    title: '경전 탐색 및 검색',
    searchPlaceholder: '경전명, 구절 번호, 본문 검색',
    searchCount: (n) => `검색 결과 ${n}건`,
    noResults: '일치하는 구절이 없습니다.',
    unitLabel: (n) => `${n}구절`,
    traditions: {
      all: '전체',
      early_buddhism: '초기불교',
      mahayana: '대승불교',
      korean_treatise: '한국 찬술',
    },
  },
  practice: {
    title: '수행과 읽기 계획',
    subtitle: (c) => `경쟁이나 강요 없이, 스스로의 호흡에 맞추어 이어갑니다. (누적 읽은 구절 ${c}회)`,
    timerTitle: '고요한 호흡 명상 타이머',
    timerDesc: '오늘 읽은 구절을 떠올리며 3분간 호흡을 살핍니다.',
    pause: '일시 정지',
    restart: '다시 시작',
    start: '명상 시작',
    reset: '초기화',
    plansTitle: '읽기 계획 (7 / 30 / 100일)',
    daysUnit: '일',
    startPlan: '계획 시작하기',
    readDay: (d) => `${d}일차 읽기`,
    manualComplete: '수동 완료',
    reminderLabel: '매일 아침 08:00 알림 (선택)',
    reminderAlertTitle: '알림 안내',
  },
  saved: {
    title: '저장한 구절과 기록',
    bookmarksTab: (n) => `마음에 담은 구절 (${n})`,
    notesTab: (n) => `비공개 일지 (${n})`,
    allFolder: '전체',
    defaultFolder: '기본 모음',
    emptyBookmarks: '아직 마음에 담은 구절이 없습니다. 홈에서 찜 버튼을 눌러 저장해 보세요.',
    emptyNotes: '작성된 비공개 수행 일지가 없습니다.',
    folderLabel: (f, d) => `모음: ${f} · 저장일: ${d}`,
    jumpToVerse: '해당 구절로 이동 →',
    saveEdit: '수정 저장',
    viewOriginal: '원문 보기 →',
  },
  my: {
    title: '설정 및 개인정보',
    languageTitle: '앱 및 경전 언어',
    koreanLabel: '한국어',
    englishLabel: 'English',
    pwaTitle: '전체화면 앱 실행 (상단 주소창 제거)',
    pwaActive: '✓ 현재 주소창 없는 전체화면 앱 모드로 실행 중입니다.',
    pwaGuide:
      '브라우저 상단 주소창이나 사이트 바가 보인다면 기존 홈 화면 바로가기를 삭제한 뒤, Chrome "앱 설치" 또는 Safari "홈 화면에 추가"로 다시 설치해 주세요.',
    pwaInstallBtn: '홈 화면에 앱 설치하기',
    pwaGuideBtn: '전체화면 앱 설치 방법 보기',
    pwaToast: 'Android Chrome 메뉴의 "앱 설치" 또는 iOS Safari "홈 화면에 추가"를 사용해 주세요.',
    statsTitle: '나의 수행 발자취 (로컬 전용)',
    statRead: '읽은 구절',
    statSaved: '담은 구절',
    statNotes: '수행 일지',
    fontSizeTitle: (sp) => `본문 글자 크기 (5단계 · 현재 ${sp}sp)`,
    fontStyleAndLineTitle: '본문 글꼴 및 줄 간격',
    sansLabel: '고딕체',
    serifLabel: '명조체',
    lineNarrow: '좁게',
    lineNormal: '보통',
    lineWide: '넓게',
    themeTitle: '화면 테마',
    themeSystem: '시스템',
    themeLight: '라이트(한지)',
    themeDark: '다크(수묵)',
    reduceMotion: '모션 감소 (애니메이션 최소화)',
    ttsSpeed: (r) => `음성 낭독 속도: ${r.toFixed(2)}x`,
    sourcesTitle: '출처 · 권리 · 개인정보',
    sourcesBtn: (n) => `수록 판본 출처 및 권리 안내 (${n}건)`,
    privacyBtn: '개인정보 처리방침 및 오픈소스 고지',
    backupTitle: '데이터 백업 및 삭제',
    backupDesc: '모든 읽기 기록과 수행 일지는 기기 내부에만 저장되며, 외부 서버로 전송되지 않습니다.',
    exportBtn: 'JSON으로 내보내기 (백업)',
    restoreBtn: 'JSON 백업에서 복원하기',
    wipeBtn: '모든 개인 데이터 삭제',
    wipeConfirmTitle: '모든 개인 데이터 삭제',
    wipeConfirmBody: '저장한 구절, 비공개 일지, 읽기 기록 및 설정이 영구 삭제됩니다. 계속하시겠습니까?',
    cancel: '취소',
    confirmDelete: '삭제',
    exportedMsg: '백업 JSON 파일을 다운로드했습니다.',
    restoredMsg: '백업 데이터를 복원했습니다.',
    wipedMsg: '모든 개인 데이터를 삭제했습니다.',
    restoreModalTitle: 'JSON 백업 복원',
    restorePlaceholder: '내보낸 백업 JSON 전체를 붙여넣으세요',
    restoreExecBtn: '백업 데이터 복원 실행',
    restoreFailTitle: '복원 실패',
    sourcesModalTitle: '수록 판본 출처 및 권리 안내',
    privacyModalTitle: '개인정보 처리방침 및 오픈소스 고지',
    privacyHeading: '개인정보 최소 수집 및 로컬 비공개 원칙',
    privacyBody:
      '본 앱은 비회원·오프라인 우선으로 작동하며, 사용자의 종교·사상·신념을 드러낼 수 있는 경전 읽기 기록, 북마크, 수행 일지를 외부 서버에 저장하지 않습니다. 광고 추적이나 맞춤형 광고 타기팅을 수행하지 않으며, AI 탐구 기능 이용 시에도 개인 일지는 전송되지 않습니다.',
    ossHeading: '오픈소스 고지',
    permShare: '공유',
    permTts: '음성',
    permAi: 'AI 근거',
    allowed: '허용',
    restricted: '제한',
    translatorLabel: '번역/편집',
    licenseLabel: '라이선스',
  },
  study: {
    title: '경전 탐구',
    bodyLabel: '경전 본문',
    tabs: {
      easy: '쉬운 해설',
      context: '배경',
      terms: '원어',
      related: '관련 경전',
      practice: '교리·실천',
      ai: 'AI 탐구',
    },
    emptyAnnotations: '검수된 해설이 아직 없습니다.',
    emptyRelated: '검수된 관련 경전이 아직 없습니다.',
    originalTitle: '원문',
    notePrefix: '유의',
    sourcePrefix: '출처',
    parallelBadge: '평행경',
    thematicBadge: '주제 유사 구절',
    aiRestricted: '이 판본은 저작자의 요청 또는 라이선스 조건상 AI 처리를 지원하지 않습니다.',
    aiPlaceholder: '이 구절에 대해 궁금한 점을 입력하세요 (비워두면 요약 생성)',
    aiRun: 'AI 심층 탐구 보기',
    aiRunning: '근거 확인 중...',
    aiBadgeMock: 'AI 보조 해설 · 개발용 모의 응답 (경전 원문이 아닙니다)',
    aiBadge: 'AI 보조 해설 (경전 원문이 아닙니다)',
    aiPracticePrefix: '실천',
    aiCitationsPrefix: '인용 근거',
    aiMissingCorpus: '승인된 판본 데이터가 없어 AI 탐구를 실행할 수 없습니다.',
  },
  noteModal: {
    title: '비공개 수행 기록',
    subtitleSuffix: '기기에만 저장',
    bodyPlaceholder: '이 구절을 읽고 떠오른 생각이나 오늘의 다짐을 적어보세요.',
    tagsPlaceholder: '태그 (쉼표로 구분, 예: 마음, 아침명상)',
    saveBtn: '비공개 기록 저장',
    updateBtn: '기록 수정 완료',
    existingTitle: (n) => `이 구절의 기존 기록 (${n})`,
    empty: '아직 작성된 기록이 없습니다.',
    edit: '수정',
    del: '삭제',
    unsavedTitle: '작성 중인 기록',
    unsavedBody: '저장하지 않은 내용이 있습니다. 닫으시겠습니까?',
    keepEditing: '계속 작성',
    discard: '닫기',
  },
  viralModal: {
    title: '마음 나누기 · 공유 카드',
    subtitle: '한 구절의 울림을 이미지 카드나 문구로 전해 보세요',
    presets: { hanji: '한지', forest: '산사', ink: '수묵' },
    restrictedBody: '[권리 제한 안내] 이 판본은 원문 본문 재배포가 제한되어 출처 링크만 공유할 수 있습니다.',
    saveImage: '카드 이미지 저장',
    shareCard: '카드 공유',
    copyText: '문구 복사',
    sendFriend: '지인에게 전달',
    copiedMsg: '구절과 출처가 클립보드에 복사되었습니다.',
    savedImageMsg: '공유용 카드 이미지를 저장했습니다.',
  },
  topics: {
    마음: '마음',
    자비: '자비',
    지혜: '지혜',
    내려놓음: '내려놓음',
    '마음의 평온': '마음의 평온',
    '분노 다스리기': '분노 다스리기',
    '고통과 슬픔': '고통과 슬픔',
    인간관계: '인간관계',
    '삶과 죽음': '삶과 죽음',
    '행복과 감사': '행복과 감사',
    '인내와 용기': '인내와 용기',
    깨달음: '깨달음',
    수행: '수행',
    '잠들기 전': '잠들기 전',
  },
};

const EN_STRINGS: AppStrings = {
  appName: 'Dharma Scroll',
  appShort: 'Dharma Scroll',
  tabs: { home: 'Home', library: 'Library', practice: 'Practice', saved: 'Saved', my: 'My' },
  home: {
    sequential: 'Sequential',
    topic: 'Topics',
    edition: 'Edition',
    loading: 'Loading scriptures...',
    errorTitle: 'Error',
    emptyFeed: 'No passages available for this selection.',
    endTopic: (topic) => `Completed "${topic}" topic feed`,
    endWork: (title) => `You have reached the end of ${title}`,
    endDesc: 'Pause for a quiet breath and reflect on what resonated today.',
    chooseNext: 'Choose Another Text',
    editionModalTitle: 'Select Translation or Original',
    topicModalTitle: 'Choose a Topic Feed',
    missingSegment: 'Unable to find that passage.',
    fullscreenEnter: 'Fullscreen without address bar',
    fullscreenExit: 'Exit fullscreen',
    fullscreenHint: 'Use "Install App" or "Add to Home Screen" in your mobile browser to launch without any browser bar.',
    shareRestrictedAlertTitle: 'Share Notice',
    shareRestrictedAlertBody: 'This edition restricts body text sharing, so only the citation link was shared.',
  },
  card: {
    paraphrasePrefix: 'Plain Note',
    readFull: 'Full-Screen Reader',
    readFullClose: 'Close Reader',
    originalLabel: 'Original',
    details: 'Details',
    showOriginal: 'Show Original',
    hideOriginal: 'Hide Original',
    prev: 'Prev',
    next: 'Next',
    like: 'Save',
    liked: 'Saved',
    study: 'Study',
    note: 'Journal',
    forward: 'Forward',
    viral: 'Card',
    ttsPlay: 'Listen',
    ttsStop: 'Stop',
    missingEditionText: 'This edition does not have text for this passage yet.',
    syntheticBadge: 'Demo',
  },
  library: {
    title: 'Scriptures & Search',
    searchPlaceholder: 'Search titles, verse numbers, or text',
    searchCount: (n) => `${n} results found`,
    noResults: 'No matching passages found.',
    unitLabel: (n) => `${n} passages`,
    traditions: {
      all: 'All',
      early_buddhism: 'Early Buddhism',
      mahayana: 'Mahāyāna',
      korean_treatise: 'Korean Treatises',
    },
  },
  practice: {
    title: 'Practice & Reading Plans',
    subtitle: (c) => `Build a gentle daily reading rhythm at your own pace. (${c} passages read)`,
    timerTitle: 'Quiet Breath Timer',
    timerDesc: 'Sit quietly for 3 minutes and reflect on today’s passage.',
    pause: 'Pause',
    restart: 'Restart',
    start: 'Start Timer',
    reset: 'Reset',
    plansTitle: 'Reading Plans (7 / 30 / 100 Days)',
    daysUnit: 'days',
    startPlan: 'Start Plan',
    readDay: (d) => `Read Day ${d}`,
    manualComplete: 'Mark Done',
    reminderLabel: 'Daily 08:00 AM Reminder (Optional)',
    reminderAlertTitle: 'Reminder Notice',
  },
  saved: {
    title: 'Saved Verses & Journal',
    bookmarksTab: (n) => `Saved (${n})`,
    notesTab: (n) => `Private Journal (${n})`,
    allFolder: 'All',
    defaultFolder: 'Default',
    emptyBookmarks: 'No saved passages yet. Tap the heart icon on Home to save one.',
    emptyNotes: 'No private reflection notes yet.',
    folderLabel: (f, d) => `Collection: ${f} · Saved: ${d}`,
    jumpToVerse: 'Go to Passage →',
    saveEdit: 'Save Changes',
    viewOriginal: 'Open Passage →',
  },
  my: {
    title: 'Settings & Privacy',
    languageTitle: 'App & Scripture Language',
    koreanLabel: '한국어',
    englishLabel: 'English',
    pwaTitle: 'Full-Screen App Mode (No Browser Bar)',
    pwaActive: '✓ Running in standalone full-screen app mode.',
    pwaGuide:
      'If a top domain bar appears on mobile, remove any old shortcut and reinstall using Chrome "Install app" or Safari "Add to Home Screen".',
    pwaInstallBtn: 'Install App to Home Screen',
    pwaGuideBtn: 'How to Launch Full-Screen',
    pwaToast: 'Use "Install app" in Chrome menu or "Add to Home Screen" in iOS Safari.',
    statsTitle: 'Reading Footprint (Local Only)',
    statRead: 'Read',
    statSaved: 'Saved',
    statNotes: 'Notes',
    fontSizeTitle: (sp) => `Text Size (5 Steps · Current ${sp}sp)`,
    fontStyleAndLineTitle: 'Font Style & Line Spacing',
    sansLabel: 'Sans',
    serifLabel: 'Serif',
    lineNarrow: 'Tight',
    lineNormal: 'Normal',
    lineWide: 'Relaxed',
    themeTitle: 'Appearance',
    themeSystem: 'System',
    themeLight: 'Light (Paper)',
    themeDark: 'Dark (Ink)',
    reduceMotion: 'Reduce Motion',
    ttsSpeed: (r) => `Speech Rate: ${r.toFixed(2)}x`,
    sourcesTitle: 'Sources · Rights · Privacy',
    sourcesBtn: (n) => `Scripture Sources & Licenses (${n})`,
    privacyBtn: 'Privacy Policy & Open Source Notices',
    backupTitle: 'Backup & Data Removal',
    backupDesc: 'All reading logs and journal notes stay strictly on your device and are never sent to external servers.',
    exportBtn: 'Export JSON Backup',
    restoreBtn: 'Restore from JSON Backup',
    wipeBtn: 'Delete All Personal Data',
    wipeConfirmTitle: 'Delete All Personal Data',
    wipeConfirmBody: 'All saved verses, private notes, progress, and settings will be permanently deleted. Continue?',
    cancel: 'Cancel',
    confirmDelete: 'Delete',
    exportedMsg: 'Downloaded backup JSON file.',
    restoredMsg: 'Restored backup data.',
    wipedMsg: 'All personal data deleted.',
    restoreModalTitle: 'Restore JSON Backup',
    restorePlaceholder: 'Paste your exported backup JSON here',
    restoreExecBtn: 'Restore Backup',
    restoreFailTitle: 'Restore Failed',
    sourcesModalTitle: 'Scripture Sources & Licenses',
    privacyModalTitle: 'Privacy Policy & Open Source',
    privacyHeading: 'Privacy-First Local Storage',
    privacyBody:
      'This app works offline without accounts. Your reading history, bookmarks, and private reflections stay on your device. No ad tracking or profiling is performed, and private notes are never transmitted during AI study.',
    ossHeading: 'Open Source Acknowledgments',
    permShare: 'Share',
    permTts: 'TTS',
    permAi: 'AI Study',
    allowed: 'Allowed',
    restricted: 'Restricted',
    translatorLabel: 'Translator',
    licenseLabel: 'License',
  },
  study: {
    title: 'Scripture Study',
    bodyLabel: 'Passage Text',
    tabs: {
      easy: 'Summary',
      context: 'Context',
      terms: 'Terms',
      related: 'Related',
      practice: 'Practice',
      ai: 'AI Study',
    },
    emptyAnnotations: 'No reviewed commentary is available for this passage yet.',
    emptyRelated: 'No reviewed related passages are linked yet.',
    originalTitle: 'Original Text',
    notePrefix: 'Note',
    sourcePrefix: 'Source',
    parallelBadge: 'Parallel Passage',
    thematicBadge: 'Thematic Link',
    aiRestricted: 'AI processing is disabled for this edition by translator request or license terms.',
    aiPlaceholder: 'Ask a question about this passage (leave blank for summary)',
    aiRun: 'Run Grounded AI Study',
    aiRunning: 'Checking sources...',
    aiBadgeMock: 'AI Study Aid · Dev Mock (Not canonical scripture)',
    aiBadge: 'AI Study Aid (Not canonical scripture)',
    aiPracticePrefix: 'Reflection',
    aiCitationsPrefix: 'Citations',
    aiMissingCorpus: 'Approved source corpus is unavailable for AI study.',
  },
  noteModal: {
    title: 'Private Reflection Journal',
    subtitleSuffix: 'Stored locally only',
    bodyPlaceholder: 'Write a personal reflection or intention inspired by this passage.',
    tagsPlaceholder: 'Tags (comma-separated, e.g. mindfulness, gratitude)',
    saveBtn: 'Save Private Note',
    updateBtn: 'Save Changes',
    existingTitle: (n) => `Notes for this passage (${n})`,
    empty: 'No notes recorded yet.',
    edit: 'Edit',
    del: 'Delete',
    unsavedTitle: 'Unsaved Changes',
    unsavedBody: 'You have unsaved text. Discard and close?',
    keepEditing: 'Keep Writing',
    discard: 'Discard',
  },
  viralModal: {
    title: 'Share Verse Card',
    subtitle: 'Share a passage as an image card or formatted quote',
    presets: { hanji: 'Paper', forest: 'Forest', ink: 'Ink' },
    restrictedBody: '[Rights Notice] Redistribution of this text body is restricted; only the source citation can be shared.',
    saveImage: 'Save Card Image',
    shareCard: 'Share Card',
    copyText: 'Copy Quote',
    sendFriend: 'Forward',
    copiedMsg: 'Quote and citation copied to clipboard.',
    savedImageMsg: 'Saved shareable card image (PNG).',
  },
  topics: {
    마음: 'Mind',
    자비: 'Compassion',
    지혜: 'Wisdom',
    내려놓음: 'Letting Go',
    '마음의 평온': 'Inner Peace',
    '분노 다스리기': 'Taming Anger',
    '고통과 슬픔': 'Suffering & Grief',
    인간관계: 'Relationships',
    '삶과 죽음': 'Life & Death',
    '행복과 감사': 'Joy & Gratitude',
    '인내와 용기': 'Patience & Courage',
    깨달음: 'Awakening',
    수행: 'Practice',
    '잠들기 전': 'Before Sleep',
  },
};

export function getStrings(lang: AppLanguage): AppStrings {
  return lang === 'en' ? EN_STRINGS : KO_STRINGS;
}

export function getLocalizedWorkTitle(work: Work, lang: AppLanguage): string {
  return lang === 'en' && work.titleEn ? work.titleEn : work.title;
}

export function getLocalizedWorkSubtitle(work: Work, lang: AppLanguage): string | undefined {
  return lang === 'en' && work.subtitleEn ? work.subtitleEn : work.subtitle;
}

export function getLocalizedWorkDescription(work: Work, lang: AppLanguage): string | undefined {
  return lang === 'en' && work.descriptionEn ? work.descriptionEn : work.description;
}

export function getLocalizedSourceRef(segment: Segment, lang: AppLanguage): string {
  return lang === 'en' && segment.sourceRefEn ? segment.sourceRefEn : segment.sourceRef;
}

export function getLocalizedEditionLabel(edition: Edition, lang: AppLanguage): string {
  return lang === 'en' && edition.labelEn ? edition.labelEn : edition.label;
}

export function getLocalizedTranslator(edition: Edition, lang: AppLanguage): string {
  return lang === 'en' && edition.translatorEn ? edition.translatorEn : edition.translator;
}

export function getLocalizedPlanTitle(plan: ReadingPlan, lang: AppLanguage): string {
  return lang === 'en' && plan.titleEn ? plan.titleEn : plan.title;
}

export function getLocalizedPlanDesc(plan: ReadingPlan, lang: AppLanguage): string {
  return lang === 'en' && plan.descriptionEn ? plan.descriptionEn : plan.description;
}

export function getLocalizedAnnotation(ann: Annotation, lang: AppLanguage): { title?: string; body: string; source: string } {
  if (lang === 'en') {
    return {
      title: ann.titleEn ?? ann.title,
      body: ann.bodyEn ?? ann.body,
      source: ann.sourceEn ?? ann.source,
    };
  }
  return { title: ann.title, body: ann.body, source: ann.source };
}

export function getLocalizedRelatedLink(link: RelatedLink, lang: AppLanguage): { targetTitle: string; targetRef: string; evidence: string } {
  if (lang === 'en') {
    return {
      targetTitle: link.targetTitleEn ?? link.targetTitle,
      targetRef: link.targetRefEn ?? link.targetRef,
      evidence: link.evidenceEn ?? link.evidence,
    };
  }
  return { targetTitle: link.targetTitle, targetRef: link.targetRef, evidence: link.evidence };
}

export function getLocalizedTopicLabel(topicId: string, lang: AppLanguage): string {
  return lang === 'en' ? (EN_STRINGS.topics[topicId] ?? topicId) : (KO_STRINGS.topics[topicId] ?? topicId);
}
