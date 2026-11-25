import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp, type FeedItem } from '../features/app/AppProvider';
import { MIN_TOUCH_SIZE } from './theme';

export function NoteModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: FeedItem | null;
  onClose: () => void;
}) {
  const { palette, notes, saveNote, deleteNote } = useApp();
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | undefined>(undefined);

  const segmentNotes = item ? notes.filter((n) => n.segmentId === item.segment.id) : [];

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setBody('');
      setTagInput('');
      setEditingNoteId(undefined);
    }, 0);
    return () => clearTimeout(t);
  }, [visible, item?.segment.id]);

  if (!item) return null;

  const handleCloseAttempt = () => {
    if (body.trim().length > 0) {
      Alert.alert('작성 중인 기록', '저장하지 않은 내용이 있습니다. 닫으시겠습니까?', [
        { text: '계속 작성', style: 'cancel' },
        { text: '닫기', style: 'destructive', onPress: onClose },
      ]);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    if (!body.trim()) return;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await saveNote(item.segment.id, body, tags, editingNoteId);
    setBody('');
    setTagInput('');
    setEditingNoteId(undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleCloseAttempt}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: palette.primary }]}>비공개 수행 기록</Text>
            <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
              {item.work.title} · {item.segment.sourceRef} (기기에만 저장)
            </Text>
          </View>
          <Pressable
            onPress={handleCloseAttempt}
            accessibilityRole="button"
            accessibilityLabel="수행 기록 닫기"
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={24} color={palette.textPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="이 구절을 읽고 떠오른 생각이나 오늘의 다짐을 적어보세요."
            placeholderTextColor={palette.textSecondary}
            style={[
              styles.textArea,
              {
                color: palette.textPrimary,
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          />
          <TextInput
            value={tagInput}
            onChangeText={setTagInput}
            placeholder="태그 (쉼표로 구분, 예: 마음, 아침명상)"
            placeholderTextColor={palette.textSecondary}
            style={[
              styles.input,
              {
                color: palette.textPrimary,
                backgroundColor: palette.surfaceElevated,
                borderColor: palette.border,
              },
            ]}
          />

          <Pressable
            onPress={handleSave}
            disabled={!body.trim()}
            accessibilityRole="button"
            accessibilityLabel="수행 기록 저장"
            style={[
              styles.saveBtn,
              { backgroundColor: body.trim() ? palette.primary : palette.secondary },
            ]}
          >
            <Text style={{ color: palette.textOnPrimary, fontWeight: '700', fontSize: 15 }}>
              {editingNoteId ? '기록 수정 완료' : '비공개 기록 저장'}
            </Text>
          </Pressable>

          <Text style={[styles.sectionTitle, { color: palette.primary }]}>
            이 구절의 기존 기록 ({segmentNotes.length})
          </Text>
          {segmentNotes.length === 0 ? (
            <Text style={{ color: palette.textSecondary, fontSize: 14 }}>
              아직 작성된 기록이 없습니다.
            </Text>
          ) : (
            segmentNotes.map((n) => (
              <View
                key={n.id}
                style={[styles.noteCard, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <Text style={{ color: palette.textPrimary, fontSize: 15, lineHeight: 22 }}>{n.body}</Text>
                {n.tags.length > 0 && (
                  <Text style={{ color: palette.accent, fontSize: 12 }}>
                    #{n.tags.join(' #')}
                  </Text>
                )}
                <View style={styles.noteFooter}>
                  <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
                    {new Date(n.updatedAt).toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    <Pressable
                      onPress={() => {
                        setEditingNoteId(n.id);
                        setBody(n.body);
                        setTagInput(n.tags.join(', '));
                      }}
                    >
                      <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 13 }}>수정</Text>
                    </Pressable>
                    <Pressable onPress={() => deleteNote(n.id)}>
                      <Text style={{ color: palette.danger, fontWeight: '600', fontSize: 13 }}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: {
    minWidth: MIN_TOUCH_SIZE,
    minHeight: MIN_TOUCH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    textAlignVertical: 'top',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: MIN_TOUCH_SIZE,
    fontSize: 14,
  },
  saveBtn: {
    minHeight: MIN_TOUCH_SIZE,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
  noteCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
});
