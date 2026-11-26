import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { canShareSegmentText } from '../domain/readingRules';
import { useApp, type FeedItem } from '../features/app/AppProvider';
import {
  getLocalizedEditionLabel,
  getLocalizedSourceRef,
  getLocalizedTranslator,
  getLocalizedWorkTitle,
} from '../i18n/strings';
import { buildSharePayload } from '../services/shareService';
import { resolveSegmentCardTheme } from './pageArtworks';
import { MIN_TOUCH_SIZE } from './theme';

type CardStylePreset = 'scenic' | 'hanji' | 'ink' | 'forest';

const CARD_PRESETS: Record<
  CardStylePreset,
  { label: string; bg: string; text: string; accent: string; sub: string; border: string }
> = {
  scenic: {
    label: '풍경 아트',
    bg: '#23201B',
    text: '#FFFFFF',
    accent: '#E8C584',
    sub: '#E5DFD2',
    border: '#C95B4B',
  },
  hanji: {
    label: '한지',
    bg: '#F5F2EB',
    text: '#1F1D1A',
    accent: '#C95B4B',
    sub: '#6F6A61',
    border: '#D6CEBA',
  },
  forest: {
    label: '산사',
    bg: '#23382F',
    text: '#F7F4EC',
    accent: '#E2C285',
    sub: '#C2D0C5',
    border: '#3C584C',
  },
  ink: {
    label: '수묵',
    bg: '#151C19',
    text: '#F2EFE6',
    accent: '#D4B47C',
    sub: '#A4B2A8',
    border: '#2D3A34',
  },
};

function resolveWebImageUri(src: ImageSourcePropType): string | null {
  if (typeof src === 'string') return src;
  if (src && typeof src === 'object' && 'uri' in src && typeof src.uri === 'string') {
    return src.uri;
  }
  const resolver = (
    Image as unknown as {
      resolveAssetSource?: (s: ImageSourcePropType) => { uri?: string };
    }
  ).resolveAssetSource;
  return resolver ? resolver(src)?.uri ?? null : null;
}

function loadHtmlImage(uri: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = uri;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(' ');
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

async function downloadQuoteCardPngWeb(params: {
  preset: CardStylePreset;
  artSource?: ImageSourcePropType;
  brandHeading: string;
  workTitle: string;
  sourceRef: string;
  bodyText: string;
  attribution: string;
}) {
  if (typeof document === 'undefined') return;
  const style = CARD_PRESETS[params.preset];
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = style.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (params.preset === 'scenic' && params.artSource) {
    const uri = resolveWebImageUri(params.artSource);
    const loaded = uri ? await loadHtmlImage(uri) : null;
    if (loaded) {
      const scale = Math.max(canvas.width / loaded.width, canvas.height / loaded.height);
      const dw = loaded.width * scale;
      const dh = loaded.height * scale;
      ctx.drawImage(loaded, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      const scrim = ctx.createLinearGradient(0, 0, 0, canvas.height);
      scrim.addColorStop(0, 'rgba(16, 18, 15, 0.42)');
      scrim.addColorStop(0.45, 'rgba(16, 18, 15, 0.56)');
      scrim.addColorStop(1, 'rgba(16, 18, 15, 0.84)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

  ctx.fillStyle = style.accent;
  ctx.font = '600 32px sans-serif';
  ctx.fillText(params.brandHeading, 110, 145);

  ctx.fillStyle = style.sub;
  ctx.font = '600 30px sans-serif';
  ctx.fillText(`${params.workTitle} · ${params.sourceRef}`, 110, 210);

  ctx.fillStyle = style.text;
  ctx.font = '500 46px sans-serif';
  const lines = wrapLines(ctx, params.bodyText, canvas.width - 220);
  const startY = Math.max(360, 620 - lines.length * 36);
  lines.slice(0, 12).forEach((line, idx) => {
    ctx.fillText(line, 110, startY + idx * 74);
  });

  ctx.fillStyle = style.sub;
  ctx.font = '400 26px sans-serif';
  ctx.fillText(params.attribution, 110, canvas.height - 125);

  const link = document.createElement('a');
  link.download = `dharma-scroll-${params.sourceRef.replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function ViralShareModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: FeedItem | null;
  onClose: () => void;
}) {
  const { appLanguage, strings } = useApp();
  const [preset, setPreset] = useState<CardStylePreset>('scenic');
  const [feedback, setFeedback] = useState<string | null>(null);

  const shareInfo = useMemo(() => {
    if (!item || !item.segmentText) return null;
    return buildSharePayload({
      work: item.work,
      segment: item.segment,
      edition: item.edition,
      segmentText: item.segmentText,
      rights: item.rights,
      appLanguage,
    });
  }, [appLanguage, item]);

  if (!item || !item.segmentText) return null;

  const workTitle = getLocalizedWorkTitle(item.work, appLanguage);
  const sourceRef = getLocalizedSourceRef(item.segment, appLanguage);
  const edLabel = getLocalizedEditionLabel(item.edition, appLanguage);
  const translator = getLocalizedTranslator(item.edition, appLanguage);

  const allowText = canShareSegmentText(item.rights);
  const cardTheme = CARD_PRESETS[preset];
  const rawBody = item.segmentText.paraphrase ?? item.segmentText.text;
  const cardBody = allowText ? rawBody : strings.viralModal.restrictedBody;
  const attribution = `${edLabel} · ${translator}`;
  const brandHeading = appLanguage === 'en' ? 'Dharma Scroll' : '마음스크롤 · Dharma Scroll';
  const workArtSource = resolveSegmentCardTheme(item.segment, item.work.id).image;

  const handleCopy = async () => {
    const textToCopy = shareInfo?.message ?? `${workTitle} · ${sourceRef}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(textToCopy);
      setFeedback(strings.viralModal.copiedMsg);
      return;
    }
    await Share.share({ title: shareInfo?.title ?? workTitle, message: textToCopy });
  };

  const handleNativeOrWebShare = async () => {
    const message = shareInfo?.message ?? `${workTitle} · ${sourceRef}`;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${workTitle} · ${sourceRef}`,
          text: message,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        });
        return;
      } catch {
        // User cancelled or unsupported; fallback below
      }
    }
    await Share.share({
      title: shareInfo?.title ?? workTitle,
      message,
    });
  };

  const handleSaveCardImage = async () => {
    if (Platform.OS === 'web') {
      await downloadQuoteCardPngWeb({
        preset,
        artSource: workArtSource,
        brandHeading,
        workTitle,
        sourceRef,
        bodyText: cardBody,
        attribution,
      });
      setFeedback(strings.viralModal.savedImageMsg);
      return;
    }
    await handleNativeOrWebShare();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{strings.viralModal.title}</Text>
              <Text style={styles.subtitle}>{strings.viralModal.subtitle}</Text>
            </View>
            <Pressable
              onPress={() => {
                setFeedback(null);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel={strings.noteModal.discard}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#F2EFE6" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 14 }}>
            {/* Theme Picker */}
            <View style={styles.presetRow}>
              {(Object.keys(CARD_PRESETS) as CardStylePreset[]).map((key) => {
                const active = preset === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setPreset(key)}
                    style={[
                      styles.presetChip,
                      {
                        borderColor: active ? '#C5A26A' : '#3A4A43',
                        backgroundColor: active ? '#2E473C' : '#1D2824',
                      },
                    ]}
                  >
                    <Text style={{ color: '#F2EFE6', fontWeight: '700', fontSize: 13 }}>
                      {strings.viralModal.presets[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preview Card */}
            {preset === 'scenic' ? (
              <ImageBackground
                source={workArtSource}
                style={[styles.previewCard, styles.scenicPreviewCard, { borderColor: cardTheme.accent }]}
                imageStyle={{ borderRadius: 16 }}
                resizeMode="cover"
              >
                <View style={styles.scenicPreviewScrim} />
                <View style={styles.cardTop}>
                  <Ionicons name="flower-outline" size={18} color={cardTheme.accent} />
                  <Text style={{ color: cardTheme.accent, fontWeight: '700', fontSize: 12 }}>
                    {brandHeading}
                  </Text>
                </View>
                <Text style={{ color: cardTheme.sub, fontSize: 12, fontWeight: '600' }}>
                  {workTitle} · {sourceRef}
                </Text>
                <Text style={[styles.previewBody, { color: cardTheme.text }]} numberOfLines={8}>
                  {cardBody}
                </Text>
                <Text style={{ color: cardTheme.sub, fontSize: 11 }}>{attribution}</Text>
              </ImageBackground>
            ) : (
              <View
                style={[
                  styles.previewCard,
                  { backgroundColor: cardTheme.bg, borderColor: cardTheme.accent },
                ]}
              >
                <View style={styles.cardTop}>
                  <Ionicons name="flower-outline" size={18} color={cardTheme.accent} />
                  <Text style={{ color: cardTheme.accent, fontWeight: '700', fontSize: 12 }}>
                    {brandHeading}
                  </Text>
                </View>
                <Text style={{ color: cardTheme.sub, fontSize: 12, fontWeight: '600' }}>
                  {workTitle} · {sourceRef}
                </Text>
                <Text style={[styles.previewBody, { color: cardTheme.text }]} numberOfLines={8}>
                  {cardBody}
                </Text>
                <Text style={{ color: cardTheme.sub, fontSize: 11 }}>{attribution}</Text>
              </View>
            )}

            {feedback && (
              <Text style={{ color: '#D4B47C', fontSize: 13, textAlign: 'center', fontWeight: '600' }}>
                {feedback}
              </Text>
            )}

            {/* Action Buttons */}
            <View style={styles.btnGrid}>
              <Pressable
                onPress={handleSaveCardImage}
                accessibilityRole="button"
                accessibilityLabel={strings.viralModal.saveImage}
                style={[styles.primaryBtn, { backgroundColor: '#C5A26A' }]}
              >
                <Ionicons name="image-outline" size={18} color="#19221F" />
                <Text style={styles.primaryBtnText}>
                  {Platform.OS === 'web' ? strings.viralModal.saveImage : strings.viralModal.shareCard}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                accessibilityLabel={strings.viralModal.copyText}
                style={[styles.secondaryBtn, { borderColor: '#526756' }]}
              >
                <Ionicons name="copy-outline" size={18} color="#F2EFE6" />
                <Text style={styles.secondaryBtnText}>{strings.viralModal.copyText}</Text>
              </Pressable>

              <Pressable
                onPress={handleNativeOrWebShare}
                accessibilityRole="button"
                accessibilityLabel={strings.viralModal.sendFriend}
                style={[styles.secondaryBtn, { borderColor: '#526756' }]}
              >
                <Ionicons name="paper-plane-outline" size={18} color="#F2EFE6" />
                <Text style={styles.secondaryBtnText}>{strings.viralModal.sendFriend}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#19221F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderTopColor: '#2F403A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: { color: '#F2EFE6', fontSize: 18, fontWeight: '800' },
  subtitle: { color: '#B9C7BC', fontSize: 12, marginTop: 3 },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 22,
    gap: 12,
  },
  scenicPreviewCard: {
    overflow: 'hidden',
  },
  scenicPreviewScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(16, 18, 15, 0.58)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewBody: { fontSize: 19, lineHeight: 29, fontWeight: '600', marginVertical: 6 },
  btnGrid: { gap: 10, marginTop: 4, paddingBottom: 12 },
  primaryBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#19221F', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { color: '#F2EFE6', fontWeight: '700', fontSize: 14 },
});
