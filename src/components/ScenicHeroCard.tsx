import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';

interface ScenicHeroCardProps {
  source: ImageSourcePropType;
  badgeText?: string;
  title: string;
  subtitle?: string;
  progressPct?: number;
  ctaLabel?: string;
  ctaIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onPressCta?: () => void;
  onPressChangeArt?: () => void;
  changeArtLabel?: string;
  height?: number;
  cardBg: string;
  cardBorder: string;
}

export function ScenicHeroCard({
  source,
  badgeText,
  title,
  subtitle,
  progressPct,
  ctaLabel,
  ctaIcon,
  onPressCta,
  onPressChangeArt,
  changeArtLabel,
  height = 240,
  cardBg,
  cardBorder,
}: ScenicHeroCardProps) {
  return (
    <View style={[styles.outerCard, styles.cardShadow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={styles.heroFrame}>
        <ImageBackground
          source={source}
          style={[styles.heroBg, { height }]}
          imageStyle={styles.heroBgImage}
          resizeMode="cover"
        >
          <View style={styles.scrimTop} />
          {Platform.OS === 'web' ? (
            <View
              style={[
                styles.scrimGradient,
                {
                  backgroundImage:
                    'linear-gradient(180deg, rgba(16,18,15,0.06) 0%, rgba(16,18,15,0.28) 44%, rgba(16,18,15,0.78) 100%)',
                } as unknown as Record<string, unknown>,
              ]}
            />
          ) : (
            <View style={styles.scrimBottomNative} />
          )}

          <View style={styles.innerContent}>
            <View style={styles.topRow}>
              {badgeText ? (
                <View style={styles.badgePill}>
                  <Text style={styles.badgeText}>{badgeText}</Text>
                </View>
              ) : (
                <View />
              )}
              {onPressChangeArt ? (
                <Pressable
                  onPress={onPressChangeArt}
                  accessibilityRole="button"
                  accessibilityLabel={changeArtLabel ?? 'Change art'}
                  style={styles.artBtn}
                >
                  <Ionicons name="image-outline" size={14} color="#FFFFFF" />
                  {changeArtLabel ? <Text style={styles.artBtnText}>{changeArtLabel}</Text> : null}
                </Pressable>
              ) : null}
            </View>

            <View style={styles.bottomStack}>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.heroSub} numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}

              {typeof progressPct === 'number' ? (
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
                </View>
              ) : null}

              {ctaLabel && onPressCta ? (
                <Pressable
                  onPress={onPressCta}
                  accessibilityRole="button"
                  accessibilityLabel={ctaLabel}
                  style={styles.ctaBtn}
                >
                  {ctaIcon ? <Ionicons name={ctaIcon} size={15} color="#FFFFFF" /> : null}
                  <Text style={styles.ctaText}>{ctaLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerCard: {
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  heroFrame: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  heroBg: {
    width: '100%',
    justifyContent: 'space-between',
  },
  heroBgImage: {
    borderRadius: 18,
  },
  scrimTop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(18, 20, 16, 0.10)',
  },
  scrimGradient: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  scrimBottomNative: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    backgroundColor: 'rgba(16, 18, 15, 0.56)',
  },
  innerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgePill: {
    backgroundColor: 'rgba(66, 58, 42, 0.72)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  artBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(24, 26, 22, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  artBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bottomStack: {
    gap: 6,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  ctaBtn: {
    marginTop: 4,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(28, 30, 26, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
