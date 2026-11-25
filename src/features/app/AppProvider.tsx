import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, useColorScheme } from 'react-native';
import { DARK_PALETTE, LIGHT_PALETTE, type ThemePalette } from '../../components/theme';
import { createRepository } from '../../data/createRepository';
import { DEFAULT_SETTINGS } from '../../data/inMemoryRepository';
import type { AppRepository, PersonalDataBackup, SearchResultItem } from '../../data/repository';
import { formatLocalDay } from '../../domain/readingRules';
import type {
  Annotation,
  AppSettings,
  Bookmark,
  Edition,
  FontScaleLevel,
  Note,
  PlanItem,
  PlanProgress,
  ReadingMode,
  ReadingPlan,
  RelatedLink,
  RightsManifestEntry,
  Segment,
  SegmentText,
  ThemeMode,
  Work,
} from '../../domain/types';
import { cancelPlanReminder, scheduleDailyPlanReminder } from '../../services/notificationService';
import { shareVerse } from '../../services/shareService';
import { speakSegment, stopSpeaking } from '../../services/ttsService';

const LOCAL_PROFILE_ID = 'local';

export interface FeedItem {
  segment: Segment;
  work: Work;
  edition: Edition;
  segmentText?: SegmentText;
  originalText?: SegmentText;
  originalEdition?: Edition;
  rights?: RightsManifestEntry;
}

interface AppContextValue {
  ready: boolean;
  error: string | null;
  palette: ThemePalette;
  settings: AppSettings;
  reduceMotionEffective: boolean;

  works: Work[];
  currentWork: Work | null;
  currentMode: ReadingMode;
  activeTopic: string | null;
  editionsForCurrentWork: Edition[];
  currentEdition: Edition | null;
  feedItems: FeedItem[];
  currentSegmentIndex: number;
  targetSegmentId: string | null;

  bookmarks: Bookmark[];
  notes: Note[];
  plans: ReadingPlan[];
  planProgressMap: Record<string, PlanProgress>;
  rightsEntries: RightsManifestEntry[];
  readEventsCount: number;
  ttsActiveSegmentId: string | null;

  selectWorkAndSegment: (workId: string, segmentId?: string, mode?: ReadingMode) => Promise<void>;
  navigateToSegmentById: (segmentId: string) => Promise<boolean>;
  getSegmentSummary: (segmentId: string) => Promise<{
    workTitle: string;
    sourceRef: string;
    previewText: string;
  } | null>;
  selectTopicFeed: (topic: string) => Promise<void>;
  switchEdition: (editionId: string) => Promise<{ found: boolean; message?: string }>;
  onSegmentFocused: (segmentId: string, index: number) => Promise<void>;
  markSegmentReadManual: (segmentId: string) => Promise<void>;

  toggleBookmark: (segmentId: string, editionId: string, folder?: string) => Promise<boolean>;
  saveNote: (segmentId: string, body: string, tags?: string[], noteId?: string) => Promise<Note>;
  deleteNote: (noteId: string) => Promise<void>;
  shareCurrentVerse: (item: FeedItem) => Promise<{ shared: boolean; textIncluded: boolean }>;

  getStudyDetails: (
    segmentId: string,
    editionId: string
  ) => Promise<{
    annotations: Annotation[];
    relatedLinks: RelatedLink[];
    original?: { edition: Edition; segmentText: SegmentText };
  }>;
  search: (query: string) => Promise<SearchResultItem[]>;

  startPlan: (planId: string) => Promise<void>;
  getPlanItems: (planId: string) => Promise<PlanItem[]>;
  completePlanDay: (planId: string, dayNumber: number, segmentIds: string[]) => Promise<void>;
  togglePlanReminder: (planId: string, enabled: boolean, hour: number, minute: number) => Promise<string | undefined>;

  toggleTts: (item: FeedItem) => Promise<string | undefined>;
  stopTts: () => Promise<void>;

  updateFontScale: (level: FontScaleLevel) => Promise<void>;
  updateFontStyle: (style: 'sans' | 'serif') => Promise<void>;
  updateLineHeight: (multiplier: number) => Promise<void>;
  updateThemeMode: (mode: ThemeMode) => Promise<void>;
  updateReduceMotion: (value: boolean) => Promise<void>;
  updateTtsRate: (rate: number) => Promise<void>;
  exportBackup: () => Promise<PersonalDataBackup>;
  importBackup: (rawJson: string) => Promise<void>;
  wipeAllPersonalData: () => Promise<void>;
  clearTargetSegment: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const repoRef = useRef<AppRepository>(createRepository());

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [works, setWorks] = useState<Work[]>([]);
  const [currentWork, setCurrentWork] = useState<Work | null>(null);
  const [currentMode, setCurrentMode] = useState<ReadingMode>('sequential');
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [editionsForCurrentWork, setEditionsForCurrentWork] = useState<Edition[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [targetSegmentId, setTargetSegmentId] = useState<string | null>(null);

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [planProgressMap, setPlanProgressMap] = useState<Record<string, PlanProgress>>({});
  const [rightsEntries, setRightsEntries] = useState<RightsManifestEntry[]>([]);
  const [readEventsCount, setReadEventsCount] = useState(0);
  const [ttsActiveSegmentId, setTtsActiveSegmentId] = useState<string | null>(null);

  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = useMemo(() => {
    const useDark =
      settings.themeMode === 'dark' || (settings.themeMode === 'system' && systemScheme === 'dark');
    return useDark ? DARK_PALETTE : LIGHT_PALETTE;
  }, [settings.themeMode, systemScheme]);

  const reduceMotionEffective = settings.reduceMotion || osReduceMotion;

  const buildFeedForWork = useCallback(
    async (work: Work, preferredEditionId?: string, focusSegmentId?: string) => {
      const repo = repoRef.current;
      const editions = await repo.getEditionsForWork(work.id);
      setEditionsForCurrentWork(editions);

      const chosen =
        editions.find((e) => e.id === preferredEditionId) ??
        editions.find((e) => !e.isOriginal) ??
        editions[0] ??
        null;
      setCurrentEdition(chosen);

      const segments = await repo.getSegmentsForWork(work.id);
      const items: FeedItem[] = [];
      for (const seg of segments) {
        const st = chosen ? await repo.getSegmentText(seg.id, chosen.id) : undefined;
        const orig = await repo.getOriginalTextForSegment(seg.id, work.id);
        const rights = chosen ? await repo.getRightsForEdition(chosen.id) : undefined;
        if (chosen) {
          items.push({
            segment: seg,
            work,
            edition: chosen,
            segmentText: st,
            originalText: orig?.segmentText,
            originalEdition: orig?.edition,
            rights,
          });
        }
      }

      setFeedItems(items);
      const idx = focusSegmentId
        ? Math.max(0, items.findIndex((i) => i.segment.id === focusSegmentId))
        : 0;
      setCurrentSegmentIndex(idx);
      if (focusSegmentId && items[idx]) {
        setTargetSegmentId(items[idx].segment.id);
      }
    },
    []
  );

  const refreshPersonalState = useCallback(async () => {
    const repo = repoRef.current;
    const [bms, nts, pls, evts] = await Promise.all([
      repo.getBookmarks(LOCAL_PROFILE_ID),
      repo.getNotes(LOCAL_PROFILE_ID),
      repo.getPlans(),
      repo.getReadingEvents(LOCAL_PROFILE_ID),
    ]);
    setBookmarks(bms);
    setNotes(nts);
    setPlans(pls);
    setReadEventsCount(evts.length);

    const pMap: Record<string, PlanProgress> = {};
    for (const p of pls) {
      const prog = await repo.getPlanProgress(LOCAL_PROFILE_ID, p.id);
      if (prog) pMap[p.id] = prog;
    }
    setPlanProgressMap(pMap);
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setOsReduceMotion)
      .catch(() => {});

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        stopSpeaking();
        setTtsActiveSegmentId(null);
      }
    });

    (async () => {
      try {
        const repo = repoRef.current;
        await repo.initialize();
        const loadedSettings = await repo.getSettings();
        setSettings(loadedSettings);

        const loadedWorks = await repo.getWorks();
        setWorks(loadedWorks);
        setRightsEntries(await repo.getAllRightsEntries());

        const latestProgress = await repo.getLatestReadingProgress(LOCAL_PROFILE_ID);
        if (latestProgress?.mode === 'topic' && latestProgress.workId.startsWith('topic:')) {
          const topicName = latestProgress.workId.slice('topic:'.length);
          setCurrentMode('topic');
          setActiveTopic(topicName);
          const segs = await repo.getSegmentsByTopic(topicName);
          const items: FeedItem[] = [];
          for (const seg of segs) {
            const w = loadedWorks.find((wk) => wk.id === seg.workId);
            if (!w) continue;
            const eds = await repo.getEditionsForWork(w.id);
            const preferred =
              eds.find((e) => e.id === loadedSettings.selectedEditionByWork[w.id]) ??
              eds.find((e) => !e.isOriginal) ??
              eds[0];
            if (!preferred) continue;
            const st = await repo.getSegmentText(seg.id, preferred.id);
            const orig = await repo.getOriginalTextForSegment(seg.id, w.id);
            const rights = await repo.getRightsForEdition(preferred.id);
            items.push({
              segment: seg,
              work: w,
              edition: preferred,
              segmentText: st,
              originalText: orig?.segmentText,
              originalEdition: orig?.edition,
              rights,
            });
          }
          setFeedItems(items);
          const idx = Math.max(0, items.findIndex((i) => i.segment.id === latestProgress.segmentId));
          setCurrentSegmentIndex(idx);
          if (items[idx]) setTargetSegmentId(items[idx].segment.id);
        } else {
          const initialWork =
            loadedWorks.find((w) => w.id === latestProgress?.workId) ?? loadedWorks[0] ?? null;

          if (initialWork) {
            setCurrentWork(initialWork);
            setCurrentMode('sequential');
            const edId =
              latestProgress?.editionId ?? loadedSettings.selectedEditionByWork[initialWork.id];
            await buildFeedForWork(initialWork, edId, latestProgress?.segmentId);
          }
        }

        await refreshPersonalState();
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : '초기화 중 오류가 발생했습니다.');
        setReady(true);
      }
    })();

    return () => {
      sub.remove();
      stopSpeaking();
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, [buildFeedForWork, refreshPersonalState]);

  const selectWorkAndSegment = useCallback(
    async (workId: string, segmentId?: string, mode: ReadingMode = 'sequential') => {
      const repo = repoRef.current;
      const work = works.find((w) => w.id === workId) ?? (await repo.getWorkById(workId));
      if (!work) return;

      await stopSpeaking();
      setTtsActiveSegmentId(null);
      setCurrentWork(work);
      setCurrentMode(mode);
      setActiveTopic(null);

      const savedProg = !segmentId
        ? await repo.getReadingProgress(LOCAL_PROFILE_ID, workId, mode)
        : undefined;
      const edId = settings.selectedEditionByWork[workId] ?? savedProg?.editionId;
      await buildFeedForWork(work, edId, segmentId ?? savedProg?.segmentId);
    },
    [buildFeedForWork, settings.selectedEditionByWork, works]
  );

  const navigateToSegmentById = useCallback(
    async (segmentId: string): Promise<boolean> => {
      const seg = await repoRef.current.getSegmentById(segmentId);
      if (!seg) return false;
      await selectWorkAndSegment(seg.workId, seg.id, 'sequential');
      return true;
    },
    [selectWorkAndSegment]
  );

  const getSegmentSummary = useCallback(
    async (segmentId: string) => {
      const repo = repoRef.current;
      const seg = await repo.getSegmentById(segmentId);
      if (!seg) return null;
      const work = works.find((w) => w.id === seg.workId) ?? (await repo.getWorkById(seg.workId));
      const eds = await repo.getEditionsForWork(seg.workId);
      const preferred =
        eds.find((e) => e.id === settings.selectedEditionByWork[seg.workId]) ??
        eds.find((e) => !e.isOriginal) ??
        eds[0];
      const st = preferred ? await repo.getSegmentText(seg.id, preferred.id) : undefined;
      return {
        workTitle: work?.title ?? seg.workId,
        sourceRef: seg.sourceRef,
        previewText: st?.text ?? '',
      };
    },
    [settings.selectedEditionByWork, works]
  );

  const selectTopicFeed = useCallback(
    async (topic: string) => {
      const repo = repoRef.current;
      await stopSpeaking();
      setTtsActiveSegmentId(null);
      setCurrentMode('topic');
      setActiveTopic(topic);

      const segs = await repo.getSegmentsByTopic(topic);
      const items: FeedItem[] = [];
      for (const seg of segs) {
        const work = works.find((w) => w.id === seg.workId) ?? (await repo.getWorkById(seg.workId));
        if (!work) continue;
        const eds = await repo.getEditionsForWork(work.id);
        const preferred =
          eds.find((e) => e.id === settings.selectedEditionByWork[work.id]) ??
          eds.find((e) => !e.isOriginal) ??
          eds[0];
        if (!preferred) continue;
        const st = await repo.getSegmentText(seg.id, preferred.id);
        const orig = await repo.getOriginalTextForSegment(seg.id, work.id);
        const rights = await repo.getRightsForEdition(preferred.id);
        items.push({
          segment: seg,
          work,
          edition: preferred,
          segmentText: st,
          originalText: orig?.segmentText,
          originalEdition: orig?.edition,
          rights,
        });
      }
      setFeedItems(items);
      const savedTopicProg = await repo.getReadingProgress(
        LOCAL_PROFILE_ID,
        `topic:${topic}`,
        'topic'
      );
      const idx = savedTopicProg
        ? Math.max(0, items.findIndex((i) => i.segment.id === savedTopicProg.segmentId))
        : 0;
      setCurrentSegmentIndex(idx);
      if (items[idx]) setTargetSegmentId(items[idx].segment.id);
    },
    [settings.selectedEditionByWork, works]
  );

  const switchEdition = useCallback(
    async (editionId: string): Promise<{ found: boolean; message?: string }> => {
      if (!currentWork) return { found: false, message: '선택된 경전이 없습니다.' };
      const repo = repoRef.current;
      const currentSeg = feedItems[currentSegmentIndex]?.segment;

      const updatedSettings: AppSettings = {
        ...settings,
        selectedEditionByWork: {
          ...settings.selectedEditionByWork,
          [currentWork.id]: editionId,
        },
      };
      setSettings(updatedSettings);
      await repo.saveSettings(updatedSettings);

      await buildFeedForWork(currentWork, editionId, currentSeg?.id);

      if (currentSeg) {
        const textCheck = await repo.getSegmentText(currentSeg.id, editionId);
        if (!textCheck) {
          return {
            found: false,
            message: '현재 구절에 대한 해당 판본 번역이 아직 준비되지 않았습니다.',
          };
        }
      }
      return { found: true };
    },
    [buildFeedForWork, currentSegmentIndex, currentWork, feedItems, settings]
  );

  const onSegmentFocused = useCallback(
    async (segmentId: string, index: number) => {
      setCurrentSegmentIndex(index);
      const item = feedItems[index];
      if (!item) return;

      const repo = repoRef.current;
      const progressWorkKey =
        currentMode === 'topic' && activeTopic ? `topic:${activeTopic}` : item.work.id;
      await repo.saveReadingProgress({
        profileId: LOCAL_PROFILE_ID,
        workId: progressWorkKey,
        editionId: item.edition.id,
        segmentId,
        offset: index,
        mode: currentMode,
        updatedAt: new Date().toISOString(),
      });

      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(async () => {
        const recorded = await repo.recordReadingEvent({
          profileId: LOCAL_PROFILE_ID,
          segmentId,
          localDay: formatLocalDay(new Date()),
          mode: currentMode,
          dwellMs: 2500,
        });
        if (recorded) {
          const evts = await repo.getReadingEvents(LOCAL_PROFILE_ID);
          setReadEventsCount(evts.length);
        }
      }, 2200);
    },
    [activeTopic, currentMode, feedItems]
  );

  const markSegmentReadManual = useCallback(
    async (segmentId: string) => {
      const repo = repoRef.current;
      const recorded = await repo.recordReadingEvent({
        profileId: LOCAL_PROFILE_ID,
        segmentId,
        localDay: formatLocalDay(new Date()),
        mode: currentMode,
        dwellMs: 0,
        isManual: true,
      });
      if (recorded) {
        const evts = await repo.getReadingEvents(LOCAL_PROFILE_ID);
        setReadEventsCount(evts.length);
      }
    },
    [currentMode]
  );

  const toggleBookmark = useCallback(
    async (segmentId: string, editionId: string, folder = '기본 모음') => {
      const repo = repoRef.current;
      const result = await repo.toggleBookmark(LOCAL_PROFILE_ID, segmentId, editionId, folder);
      setBookmarks(await repo.getBookmarks(LOCAL_PROFILE_ID));
      return result;
    },
    []
  );

  const saveNote = useCallback(
    async (segmentId: string, body: string, tags: string[] = [], noteId?: string) => {
      const repo = repoRef.current;
      const saved = await repo.saveNote(LOCAL_PROFILE_ID, segmentId, body, tags, noteId);
      setNotes(await repo.getNotes(LOCAL_PROFILE_ID));
      return saved;
    },
    []
  );

  const deleteNote = useCallback(async (noteId: string) => {
    const repo = repoRef.current;
    await repo.deleteNote(LOCAL_PROFILE_ID, noteId);
    setNotes(await repo.getNotes(LOCAL_PROFILE_ID));
  }, []);

  const shareCurrentVerse = useCallback(async (item: FeedItem) => {
    if (!item.segmentText) {
      return { shared: false, textIncluded: false };
    }
    return shareVerse({
      work: item.work,
      segment: item.segment,
      edition: item.edition,
      segmentText: item.segmentText,
      rights: item.rights,
    });
  }, []);

  const getStudyDetails = useCallback(async (segmentId: string, editionId: string) => {
    const repo = repoRef.current;
    const seg = await repo.getSegmentById(segmentId);
    const [annotations, relatedLinks, original] = await Promise.all([
      repo.getApprovedAnnotations(segmentId, editionId),
      repo.getApprovedRelatedLinks(segmentId),
      seg ? repo.getOriginalTextForSegment(segmentId, seg.workId) : Promise.resolve(undefined),
    ]);
    return { annotations, relatedLinks, original };
  }, []);

  const search = useCallback(async (query: string) => {
    return repoRef.current.searchSegments(query);
  }, []);

  const startPlan = useCallback(async (planId: string) => {
    const prog = await repoRef.current.startPlan(LOCAL_PROFILE_ID, planId);
    setPlanProgressMap((prev) => ({ ...prev, [planId]: prog }));
  }, []);

  const getPlanItems = useCallback(async (planId: string) => {
    return repoRef.current.getPlanItems(planId);
  }, []);

  const completePlanDay = useCallback(
    async (planId: string, dayNumber: number, segmentIds: string[]) => {
      const prog = await repoRef.current.completePlanDay(
        LOCAL_PROFILE_ID,
        planId,
        dayNumber,
        segmentIds
      );
      setPlanProgressMap((prev) => ({ ...prev, [planId]: prog }));
    },
    []
  );

  const togglePlanReminder = useCallback(
    async (planId: string, enabled: boolean, hour: number, minute: number) => {
      const plan = plans.find((p) => p.id === planId);
      let msg: string | undefined;
      if (enabled) {
        const res = await scheduleDailyPlanReminder({
          planId,
          planTitle: plan?.title ?? '경전 읽기 계획',
          hour,
          minute,
        });
        if (!res.scheduled) {
          msg = res.reason;
        }
      } else {
        await cancelPlanReminder(planId);
      }
      const prog = await repoRef.current.updatePlanReminder(
        LOCAL_PROFILE_ID,
        planId,
        enabled,
        hour,
        minute
      );
      setPlanProgressMap((prev) => ({ ...prev, [planId]: prog }));
      return msg;
    },
    [plans]
  );

  const toggleTts = useCallback(
    async (item: FeedItem) => {
      if (ttsActiveSegmentId === item.segment.id) {
        await stopSpeaking();
        setTtsActiveSegmentId(null);
        return undefined;
      }
      if (!item.segmentText) {
        return '낭독할 본문이 없습니다.';
      }
      const res = await speakSegment({
        text: item.segmentText.text,
        lang: item.edition.lang,
        rate: settings.ttsRate,
        voiceId: settings.ttsVoiceId,
        rights: item.rights,
        onDone: () => setTtsActiveSegmentId(null),
        onStopped: () => setTtsActiveSegmentId(null),
        onError: () => setTtsActiveSegmentId(null),
      });
      if (res.started) {
        setTtsActiveSegmentId(item.segment.id);
        return undefined;
      }
      return res.reason;
    },
    [settings.ttsRate, settings.ttsVoiceId, ttsActiveSegmentId]
  );

  const stopTts = useCallback(async () => {
    await stopSpeaking();
    setTtsActiveSegmentId(null);
  }, []);

  const updateFontScale = useCallback(
    async (level: FontScaleLevel) => {
      const next = { ...settings, fontScaleLevel: level };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const updateFontStyle = useCallback(
    async (fontStyle: 'sans' | 'serif') => {
      const next = { ...settings, fontStyle };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const updateLineHeight = useCallback(
    async (lineHeightMultiplier: number) => {
      const next = { ...settings, lineHeightMultiplier };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const updateThemeMode = useCallback(
    async (mode: ThemeMode) => {
      const next = { ...settings, themeMode: mode };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const updateReduceMotion = useCallback(
    async (value: boolean) => {
      const next = { ...settings, reduceMotion: value };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const updateTtsRate = useCallback(
    async (rate: number) => {
      const next = { ...settings, ttsRate: rate };
      setSettings(next);
      await repoRef.current.saveSettings(next);
    },
    [settings]
  );

  const exportBackup = useCallback(async () => {
    return repoRef.current.exportPersonalData(LOCAL_PROFILE_ID);
  }, []);

  const importBackup = useCallback(
    async (rawJson: string) => {
      const parsed = JSON.parse(rawJson) as PersonalDataBackup;
      await repoRef.current.importPersonalData(parsed);
      const reloadedSettings = await repoRef.current.getSettings();
      setSettings(reloadedSettings);
      await refreshPersonalState();
    },
    [refreshPersonalState]
  );

  const wipeAllPersonalData = useCallback(async () => {
    await repoRef.current.deleteAllPersonalData(LOCAL_PROFILE_ID);
    setSettings(DEFAULT_SETTINGS);
    await refreshPersonalState();
  }, [refreshPersonalState]);

  const clearTargetSegment = useCallback(() => {
    setTargetSegmentId(null);
  }, []);

  const value: AppContextValue = {
    ready,
    error,
    palette,
    settings,
    reduceMotionEffective,
    works,
    currentWork,
    currentMode,
    activeTopic,
    editionsForCurrentWork,
    currentEdition,
    feedItems,
    currentSegmentIndex,
    targetSegmentId,
    bookmarks,
    notes,
    plans,
    planProgressMap,
    rightsEntries,
    readEventsCount,
    ttsActiveSegmentId,
    selectWorkAndSegment,
    navigateToSegmentById,
    getSegmentSummary,
    selectTopicFeed,
    switchEdition,
    onSegmentFocused,
    markSegmentReadManual,
    toggleBookmark,
    saveNote,
    deleteNote,
    shareCurrentVerse,
    getStudyDetails,
    search,
    startPlan,
    getPlanItems,
    completePlanDay,
    togglePlanReminder,
    toggleTts,
    stopTts,
    updateFontScale,
    updateFontStyle,
    updateLineHeight,
    updateThemeMode,
    updateReduceMotion,
    updateTtsRate,
    exportBackup,
    importBackup,
    wipeAllPersonalData,
    clearTargetSegment,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
