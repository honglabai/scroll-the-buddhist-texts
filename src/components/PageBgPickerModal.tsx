import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ArtworkPresetId, PageArtworkKey } from '../domain/types';
import { useApp } from '../features/app/AppProvider';
import { ARTWORK_PRESET_IDS, ARTWORK_PRESETS, DEFAULT_PAGE_ARTWORK } from './pageArtworks';
import { MIN_TOUCH_SIZE } from './theme';

export function PageBgPickerModal({
  visible,
  pageKey,
  onClose,
}: {
  visible: boolean;
  pageKey: PageArtworkKey;
  onClose: () => void;
}) {
  const { palette, strings, settings, updatePageArtwork } = useApp();
  const activePresetId = settings.pageArtworkOverrides?.[pageKey] ?? DEFAULT_PAGE_ARTWORK[pageKey];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: palette.card }]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>
                {strings.artwork.pickerTitle} · {strings.artwork.pageNames[pageKey]}
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: 2 }}>
                {strings.artwork.pickerDesc}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
              <Ionicons name="close" size={24} color={palette.textPrimary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.grid}>
            {ARTWORK_PRESET_IDS.map((presetId: ArtworkPresetId) => {
              const entry = ARTWORK_PRESETS[presetId];
              const selected = activePresetId === presetId;
              return (
                <Pressable
                  key={presetId}
                  onPress={async () => {
                    await updatePageArtwork(pageKey, presetId);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={strings.artwork.presetNames[presetId]}
                  style={[
                    styles.itemCard,
                    {
                      borderColor: selected ? palette.coral : palette.border,
                      borderWidth: selected ? 2.5 : 1,
                    },
                  ]}
                >
                  <ImageBackground
                    source={entry.source}
                    style={styles.itemImage}
                    imageStyle={{ borderRadius: 14 }}
                    resizeMode="cover"
                  >
                    <View style={styles.itemScrim} />
                    <View style={styles.itemInner}>
                      <View style={styles.itemTop}>
                        {selected ? (
                          <View style={[styles.checkBadge, { backgroundColor: palette.coral }]}>
                            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                          </View>
                        ) : (
                          <View />
                        )}
                      </View>
                      <View>
                        <Text style={styles.itemName}>{strings.artwork.presetNames[presetId]}</Text>
                        <Text style={styles.itemCredit} numberOfLines={1}>
                          {entry.licenseNote}
                        </Text>
                      </View>
                    </View>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 16, 14, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    alignSelf: 'center',
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  itemImage: {
    height: 112,
    width: '100%',
  },
  itemScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(14, 16, 13, 0.44)',
  },
  itemInner: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  itemCredit: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 11,
    marginTop: 2,
  },
});
