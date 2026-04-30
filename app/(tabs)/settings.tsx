import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/hooks/useSettings';
import type { QuizType, MeaningDisplay } from '@/lib/types';

const QUIZ_TYPES: { value: QuizType; label: string; icon: string }[] = [
  { value: 'multiple-choice', label: '객관식', icon: 'list-outline' },
  { value: 'written', label: '주관식', icon: 'create-outline' },
  { value: 'fill-in-blank', label: '빈칸 채우기', icon: 'text-outline' },
];

const INTERVALS = [5, 15, 30, 60, 120];

export default function SettingsScreen() {
  const { settings, loading, update } = useSettings();

  const handleUpdate = async (updates: Partial<typeof settings>) => {
    try {
      await update(updates);
    } catch (err) {
      Alert.alert('오류', '설정 저장에 실패했습니다');
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="pt-14 px-6 pb-4">
        <Text className="text-3xl font-bold text-foreground">설정</Text>
      </View>

      <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Quiz Type */}
        <Text className="text-lg font-semibold text-foreground mb-3">📝 퀴즈 유형</Text>
        <View className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          {QUIZ_TYPES.map((type, i) => (
            <TouchableOpacity
              key={type.value}
              className={`flex-row items-center px-4 py-3.5 ${
                i < QUIZ_TYPES.length - 1 ? 'border-b border-border' : ''
              }`}
              onPress={() => handleUpdate({ quiz_type: type.value })}
            >
              <Ionicons name={type.icon as any} size={20} color="#7c3aed" />
              <Text className="flex-1 text-base text-foreground ml-3">{type.label}</Text>
              {settings.quiz_type === type.value && (
                <Ionicons name="checkmark-circle" size={22} color="#7c3aed" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Interval */}
        <Text className="text-lg font-semibold text-foreground mb-3">⏱ 퀴즈 간격</Text>
        <View className="bg-card rounded-xl border border-border p-4 mb-6">
          <View className="flex-row flex-wrap gap-2">
            {INTERVALS.map((m) => (
              <TouchableOpacity
                key={m}
                className={`px-4 py-2 rounded-lg ${
                  settings.quiz_interval_minutes === m
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
                onPress={() => handleUpdate({ quiz_interval_minutes: m })}
              >
                <Text
                  className={`text-sm font-medium ${
                    settings.quiz_interval_minutes === m
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {m}분
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sound */}
        <Text className="text-lg font-semibold text-foreground mb-3">🔊 소리</Text>
        <View className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          <TouchableOpacity
            className="flex-row items-center px-4 py-3.5"
            onPress={() => handleUpdate({ sound_enabled: !settings.sound_enabled })}
          >
            <Ionicons
              name={settings.sound_enabled ? 'volume-high' : 'volume-mute'}
              size={20}
              color="#7c3aed"
            />
            <Text className="flex-1 text-base text-foreground ml-3">퀴즈 효과음</Text>
            <View
              className={`w-12 h-7 rounded-full ${
                settings.sound_enabled ? 'bg-primary' : 'bg-muted'
              } items-${settings.sound_enabled ? 'end' : 'start'} justify-center px-0.5`}
            >
              <View className="w-5 h-5 bg-white rounded-full" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Account */}
        <Text className="text-lg font-semibold text-foreground mb-3">ℹ️ 정보</Text>
        <View className="bg-card rounded-xl border border-border p-4 mb-6">
          <Text className="text-sm text-muted-foreground">
            VocaQuest v1.0.0{'\n'}
            싱글 유저 모드 · Supabase 백엔드{'\n'}
            EXPO_PUBLIC_SUPABASE_URL 환경변수 필요
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
