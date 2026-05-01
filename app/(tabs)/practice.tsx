import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/hooks/useSettings';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizModal } from '@/components/QuizModal';

export default function PracticeScreen() {
  const { settings } = useSettings();
  const { state, error, debugLog, quizStats, triggerQuiz, answer, answerWritten, dismiss, pause } = useQuiz(
    settings.quiz_interval_minutes,
    settings.quiz_type
  );

  const isIdle = state.status === 'idle';
  const isLoading = state.status === 'loading';
  const isPresenting = state.status === 'presenting';
  const isResult = state.status === 'result';

  const nextQuizLabel = !isIdle
    ? null
    : state.nextQuizAt > Date.now()
    ? new Date(state.nextQuizAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : '지금';

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="pt-14 px-6 pb-4">
          <Text className="text-3xl font-bold text-foreground">연습</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            {settings.quiz_type === 'multiple-choice'
              ? '객관식'
              : settings.quiz_type === 'written'
              ? '주관식'
              : '빈칸 채우기'}{' '}
            · {settings.quiz_interval_minutes}분 간격
          </Text>
        </View>

        <View className="px-6 items-center">
          {/* Status card */}
          <View className="bg-card rounded-2xl p-8 border border-border w-full items-center">
            <View className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Ionicons
                name={isLoading ? 'hourglass-outline' : 'play-outline'}
                size={36}
                color="#7c3aed"
              />
            </View>
            <Text className="text-xl font-bold text-foreground mb-2">
              {isLoading ? '퀴즈 준비 중...' : isIdle ? '단어 퀴즈' : '퀴즈 진행 중'}
            </Text>
            <Text className="text-muted-foreground text-center mb-6">
              {isIdle
                ? `다음 퀴즈는 ${nextQuizLabel}에 시작됩니다\n지금 바로 풀어볼 수도 있어요`
                : '퀴즈가 끝나면 결과를 확인하세요'}
            </Text>

            <TouchableOpacity
              className={`w-full rounded-xl py-4 items-center ${
                isIdle || isLoading ? 'bg-primary' : 'bg-muted'
              }`}
              onPress={triggerQuiz}
              disabled={!isIdle && !isLoading}
            >
              <Text
                className={`text-base font-bold ${
                  isIdle || isLoading ? 'text-primary-foreground' : 'text-muted-foreground'
                }`}
              >
                {isLoading ? '로딩 중...' : '지금 퀴즈 풀기'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          {quizStats.totalActive > 0 && (
            <View className="mt-4 bg-card rounded-xl p-4 border border-border w-full">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-muted-foreground">마스터 진행률</Text>
                <Text className="text-xs text-muted-foreground">
                  {quizStats.mastered}/{quizStats.totalActive} ({Math.round((quizStats.mastered / quizStats.totalActive) * 100)}%)
                </Text>
              </View>
              <View className="h-2 bg-muted rounded-full overflow-hidden">
                <View
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${Math.round((quizStats.mastered / quizStats.totalActive) * 100)}%` }}
                />
              </View>
              <Text className="text-xs text-muted-foreground mt-2 text-center">
                🎯 학습할 단어 {quizStats.unmastered}개 남음
              </Text>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View className="mt-4 bg-red-500/10 rounded-xl p-4 border border-red-500/30 w-full">
              <Text className="text-red-400 text-sm text-center">{error}</Text>
            </View>
          )}

          {/* 🐛 Debug Panel */}
          <View className="mt-4 bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20 w-full">
            <Text className="text-yellow-500 text-xs font-bold mb-2">🐛 디버그 로그</Text>
            <View className="bg-black/50 rounded-lg p-3 max-h-64">
              <ScrollView nestedScrollEnabled>
                {debugLog.length === 0 ? (
                  <Text className="text-white/30 text-xs font-mono">버튼을 눌러주세요...</Text>
                ) : (
                  debugLog.map((line, i) => (
                    <Text key={i} className="text-green-400 text-xs font-mono leading-5">
                      {line}
                    </Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>

          {/* Tips */}
          <View className="mt-4 bg-card rounded-xl p-4 border border-border w-full">
            <Text className="text-sm font-medium text-foreground mb-2">💡 팁</Text>
            <Text className="text-sm text-muted-foreground">
              · 설정에서 퀴즈 유형과 간격을 변경할 수 있어요{'\n'}
              · 활성 단어장의 단어들만 퀴즈에 나와요{'\n'}
              · 객관식은 키보드로 1~4번 선택 가능해요
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Quiz Modal */}
      {(isPresenting || isResult || state.status === 'answered' || state.status === 'answered-written') && (
        <QuizModal
          state={state}
          stats={quizStats}
          onAnswer={answer}
          onAnswerWritten={answerWritten}
          onDismiss={dismiss}
          onPause={(mins) => pause(mins)}
        />
      )}
    </View>
  );
}
