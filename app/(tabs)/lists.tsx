import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWordLists, createWordList, deleteWordList, updateWordList } from '@/lib/queries';
import type { WordListWithCount } from '@/lib/types';

export default function ListsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: lists = [] } = useQuery({
    queryKey: ['wordLists'],
    queryFn: getWordLists,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createWordList(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordLists'] });
      setNewName('');
      setShowCreate(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWordList(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordLists'] }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateWordList(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wordLists'] }),
  });

  const handleDelete = (id: string, name: string) => {
    Alert.alert('단어장 삭제', `"${name}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const renderItem = ({ item }: { item: WordListWithCount }) => (
    <TouchableOpacity
      className="bg-card rounded-xl p-4 mb-2 border border-border"
      onPress={() => router.push(`/list/${item.id}`)}
      onLongPress={() => handleDelete(item.id, item.name)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-medium text-foreground">{item.name}</Text>
            {item.active && (
              <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                <Text className="text-xs text-primary font-medium">활성</Text>
              </View>
            )}
          </View>
          <Text className="text-sm text-muted-foreground mt-1">
            {item.word_count} 단어 · {item.description || '설명 없음'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => toggleActive.mutate({ id: item.id, active: !item.active })}
          className="p-2"
        >
          <Ionicons
            name={item.active ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={24}
            color={item.active ? '#22c55e' : '#9ca3af'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="pt-14 px-6 pb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold text-foreground">단어장</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            좌우로 밀어 활성화 · 길게 눌러 삭제
          </Text>
        </View>
        <TouchableOpacity
          className="bg-primary w-10 h-10 rounded-full items-center justify-center"
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {showCreate && (
        <View className="px-6 mb-4">
          <View className="bg-card rounded-xl p-4 border border-border">
            <TextInput
              className="bg-muted rounded-lg px-4 py-3 text-base text-foreground mb-3"
              placeholder="단어장 이름"
              placeholderTextColor="#9ca3af"
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="flex-1 bg-muted rounded-lg py-2.5 items-center"
                onPress={() => { setShowCreate(false); setNewName(''); }}
              >
                <Text className="text-muted-foreground font-medium">취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-primary rounded-lg py-2.5 items-center"
                onPress={() => newName.trim() && createMutation.mutate(newName.trim())}
                disabled={!newName.trim() || createMutation.isPending}
              >
                <Text className="text-primary-foreground font-medium">
                  {createMutation.isPending ? '생성 중...' : '만들기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={lists}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center py-12">
            <Ionicons name="book-outline" size={48} color="#9ca3af" />
            <Text className="text-muted-foreground mt-3 text-center">
              아직 단어장이 없어요{'\n'}+ 버튼을 눌러 만들어보세요
            </Text>
          </View>
        }
      />
    </View>
  );
}
