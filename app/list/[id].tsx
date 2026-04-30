import { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWords, addWord, deleteWord, setWordMastered, getWordLists } from '@/lib/queries';
import type { Word } from '@/lib/types';

export default function WordListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');

  const { data: lists = [] } = useQuery({
    queryKey: ['wordLists'],
    queryFn: getWordLists,
  });
  const list = lists.find((l) => l.id === id);

  const { data: words = [], isLoading } = useQuery({
    queryKey: ['words', id],
    queryFn: () => getWords(id),
    enabled: !!id,
  });

  const addMutation = useMutation({
    mutationFn: () => addWord(newWord, id, newMeaning || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['words', id] });
      setNewWord('');
      setNewMeaning('');
      setShowAdd(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (wordId: string) => deleteWord(wordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['words', id] }),
  });

  const masterMutation = useMutation({
    mutationFn: ({ wordId, mastered }: { wordId: string; mastered: boolean }) =>
      setWordMastered(wordId, mastered),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['words', id] }),
  });

  const renderWord = useCallback(
    ({ item }: { item: Word }) => (
      <View className="bg-card rounded-xl p-4 mb-2 border border-border">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className={`text-base font-semibold ${item.mastered ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {item.word}
              </Text>
              {item.llm_generated ? (
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              ) : (
                <View className="bg-yellow-500/20 px-1.5 py-0.5 rounded-full">
                  <Text className="text-xs text-yellow-600">생성 중</Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-muted-foreground mt-0.5">
              {item.primary_meaning || '(의미 없음)'}
              {item.primary_pos ? ` · ${item.primary_pos}` : ''}
            </Text>
            {item.pronunciation && (
              <Text className="text-xs text-muted-foreground font-mono mt-0.5">
                /{item.pronunciation}/
              </Text>
            )}
          </View>
          <View className="flex-row gap-1">
            <TouchableOpacity
              className={`p-2 rounded-lg ${item.mastered ? 'bg-success/20' : 'bg-muted'}`}
              onPress={() => masterMutation.mutate({ wordId: item.id, mastered: !item.mastered })}
            >
              <Ionicons
                name={item.mastered ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={20}
                color={item.mastered ? '#22c55e' : '#9ca3af'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="p-2 rounded-lg bg-muted"
              onPress={() => {
                Alert.alert('단어 삭제', `"${item.word}"을(를) 삭제할까요?`, [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    []
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: list?.name || '단어장' }} />

      <View className="flex-1">
        {/* Add word bar */}
        <View className="px-4 py-3 border-b border-border">
          {showAdd ? (
            <View className="gap-2">
              <TextInput
                className="bg-muted rounded-lg px-4 py-2.5 text-base text-foreground"
                placeholder="영어 단어"
                placeholderTextColor="#9ca3af"
                value={newWord}
                onChangeText={setNewWord}
                autoFocus
                autoCapitalize="none"
              />
              <TextInput
                className="bg-muted rounded-lg px-4 py-2.5 text-base text-foreground"
                placeholder="뜻 (선택)"
                placeholderTextColor="#9ca3af"
                value={newMeaning}
                onChangeText={setNewMeaning}
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-muted rounded-lg py-2.5 items-center"
                  onPress={() => setShowAdd(false)}
                >
                  <Text className="text-muted-foreground font-medium">취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary rounded-lg py-2.5 items-center"
                  onPress={() => newWord.trim() && addMutation.mutate()}
                  disabled={!newWord.trim() || addMutation.isPending}
                >
                  <Text className="text-primary-foreground font-medium">
                    {addMutation.isPending ? '추가 중...' : '추가'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              className="flex-row items-center justify-center py-2 gap-2"
              onPress={() => setShowAdd(true)}
            >
              <Ionicons name="add-circle-outline" size={20} color="#7c3aed" />
              <Text className="text-primary font-medium">단어 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={words}
          renderItem={renderWord}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            isLoading ? null : (
              <View className="items-center py-12">
                <Ionicons name="text-outline" size={48} color="#9ca3af" />
                <Text className="text-muted-foreground mt-3 text-center">
                  아직 단어가 없어요{'\n'}위에서 단어를 추가해보세요
                </Text>
              </View>
            )
          }
        />
      </View>
    </View>
  );
}
