import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getWordLists, getAllActiveWords } from '@/lib/queries';
import { useSettings } from '@/hooks/useSettings';

export default function HomeScreen() {
  const router = useRouter();
  const { settings } = useSettings();

  const { data: lists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['wordLists'],
    queryFn: getWordLists,
  });

  const { data: activeWords = [] } = useQuery({
    queryKey: ['activeWords'],
    queryFn: getAllActiveWords,
  });

  const activeLists = lists.filter((l) => l.active);
  const todayWords = activeWords.length;

  return (
    <View className="flex-1 bg-background">
      <View className="pt-14 px-6 pb-4">
        <Text className="text-3xl font-bold text-foreground">VocaQuest</Text>
        <Text className="text-muted-foreground mt-1">오늘도 단어 퀴즈 도전!</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Stats cards */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-primary/10 rounded-xl p-4">
            <Ionicons name="book" size={24} color="#7c3aed" />
            <Text className="text-2xl font-bold text-foreground mt-2">{lists.length}</Text>
            <Text className="text-sm text-muted-foreground">단어장</Text>
          </View>
          <View className="flex-1 bg-success/10 rounded-xl p-4">
            <Ionicons name="text" size={24} color="#22c55e" />
            <Text className="text-2xl font-bold text-foreground mt-2">{todayWords}</Text>
            <Text className="text-sm text-muted-foreground">학습 가능 단어</Text>
          </View>
        </View>

        {/* Active lists */}
        <Text className="text-lg font-semibold text-foreground mb-3">📚 활성 단어장</Text>
        {listsLoading ? (
          <ActivityIndicator color="#7c3aed" />
        ) : activeLists.length === 0 ? (
          <View className="bg-card rounded-xl p-6 border border-border">
            <Text className="text-muted-foreground text-center">
              아직 활성화된 단어장이 없어요.{'\n'}단어장 탭에서 만들어보세요!
            </Text>
          </View>
        ) : (
          activeLists.slice(0, 5).map((list) => (
            <TouchableOpacity
              key={list.id}
              className="bg-card rounded-xl p-4 mb-2 border border-border"
              onPress={() => router.push(`/list/${list.id}`)}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground">{list.name}</Text>
                  <Text className="text-sm text-muted-foreground">
                    {list.word_count} 단어
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent activity placeholder */}
        <Text className="text-lg font-semibold text-foreground mt-6 mb-3">📊 학습 현황</Text>
        <View className="bg-card rounded-xl p-6 border border-border">
          <Text className="text-muted-foreground text-center">
            퀴즈를 풀면 통계가 여기에 표시됩니다
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
