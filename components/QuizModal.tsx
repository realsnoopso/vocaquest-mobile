import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { QuizState } from '@/lib/types';

interface QuizModalProps {
  state: QuizState & { status: 'presenting' | 'answered' | 'answered-written' | 'result' };
  onAnswer: (index: number) => void;
  onAnswerWritten: (text: string) => void;
  onDismiss: () => void;
  onPause: (minutes: number) => void;
}

export function QuizModal({ state, onAnswer, onAnswerWritten, onDismiss, onPause }: QuizModalProps) {
  const [writtenInput, setWrittenInput] = useState('');
  const isAnswered = state.status === 'answered' || state.status === 'answered-written';
  const isResult = state.status === 'result';

  const { question } = state;

  const handleSubmit = () => {
    if (writtenInput.trim()) {
      onAnswerWritten(writtenInput.trim());
    }
  };

  const correct = 'correct' in state ? state.correct : false;

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen">
      <View className="flex-1 bg-black">
        {/* Dark animated background */}
        <View className="absolute inset-0 overflow-hidden">
          <View className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full" />
          <View className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        >
          {/* Header */}
          <View className="items-center mb-6">
            <Text className="text-white/60 text-sm">📝 단어 퀴즈</Text>
          </View>

          {isResult ? (
            /* Result screen */
            <View className="bg-white/10 rounded-2xl p-6 backdrop-blur">
              <Text className={`text-2xl font-bold text-center mb-4 ${correct ? 'text-green-400' : 'text-red-400'}`}>
                {correct ? '✅ 정답!' : '❌ 오답'}
              </Text>

              <Text className="text-3xl font-bold text-white text-center mb-2">
                {question.word.word}
              </Text>
              {question.word.pronunciation && (
                <Text className="text-white/50 text-center font-mono mb-4">
                  /{question.word.pronunciation}/
                </Text>
              )}
              <Text className="text-lg text-white/80 text-center mb-4">
                {question.word.primary_meaning}
                {question.word.primary_pos ? ` (${question.word.primary_pos})` : ''}
              </Text>

              {question.word.meanings?.length > 0 && (
                <View className="space-y-2 mb-6">
                  {question.word.meanings.map((m, i) => (
                    <View key={i} className="bg-white/5 rounded-lg p-3">
                      <Text className="text-white/70 text-sm">
                        <Text className="font-medium">{m.pos}</Text> {m.meaning_kr}
                      </Text>
                      {m.example && (
                        <Text className="text-white/40 text-xs mt-1 italic">{m.example}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                className="bg-primary rounded-xl py-4 items-center mt-2"
                onPress={onDismiss}
              >
                <Text className="text-white font-bold text-base">닫기</Text>
              </TouchableOpacity>
            </View>
          ) : question.type === 'multiple-choice' ? (
            /* Multiple choice */
            <View>
              <Text className="text-3xl md:text-4xl font-bold text-white text-center mb-8">
                {question.word.word}
              </Text>

              <View className="gap-3">
                {question.choices.map((choice, i) => {
                  let bgClass = 'bg-white/10';
                  let textClass = 'text-white';
                  let borderClass = 'border-white/20';

                  if (isAnswered) {
                    if (i === question.correctIndex) {
                      bgClass = 'bg-green-500/20';
                      borderClass = 'border-green-500';
                      textClass = 'text-green-400';
                    } else if (i === (state.status === 'answered' ? state.selectedIndex : -1)) {
                      bgClass = 'bg-red-500/20';
                      borderClass = 'border-red-500';
                      textClass = 'text-red-400';
                    } else {
                      bgClass = 'bg-white/5';
                      textClass = 'text-white/30';
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={i}
                      className={`rounded-xl p-4 border ${borderClass} ${bgClass}`}
                      onPress={() => !isAnswered && onAnswer(i)}
                      disabled={isAnswered}
                    >
                      <Text className={`text-base ${textClass}`}>
                        <Text className="font-bold mr-2">{i + 1}.</Text>
                        {choice}
                        {isAnswered && i === question.correctIndex ? ' ✓' : ''}
                        {isAnswered && i === (state.status === 'answered' ? state.selectedIndex : -1) && i !== question.correctIndex ? ' ✗' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : question.type === 'fill-in-blank' ? (
            /* Fill in blank */
            <View>
              <Text className="text-white/60 text-center mb-4">빈칸에 들어갈 글자를 입력하세요</Text>
              <Text className="text-xl text-white text-center mb-8 leading-relaxed">
                {question.sentence}
              </Text>

              {isAnswered ? (
                <View className="gap-3">
                  <View className={`p-4 rounded-xl border ${correct ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
                    <Text className={`text-base ${correct ? 'text-green-400' : 'text-red-400'}`}>
                      내 답: {question.prefix}{writtenInput || (state.status === 'answered-written' ? state.writtenAnswer : '')}
                    </Text>
                  </View>
                  {!correct && (
                    <View className="p-4 rounded-xl bg-green-500/20 border border-green-500">
                      <Text className="text-green-400 text-base">정답: {question.word.word}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="gap-3">
                  <View className="flex-row items-center justify-center gap-1">
                    <Text className="text-xl text-white font-mono">{question.prefix}</Text>
                    <TextInput
                      className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-xl text-white text-center flex-1 max-w-48"
                      placeholder="..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      value={writtenInput}
                      onChangeText={setWrittenInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                    />
                  </View>
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 items-center"
                    onPress={handleSubmit}
                    disabled={!writtenInput.trim()}
                  >
                    <Text className="text-white font-bold text-base">확인</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : question.type === 'written' ? (
            /* Written */
            <View>
              <Text className="text-white/60 text-center mb-4">다음 뜻에 해당하는 단어를 입력하세요</Text>
              <Text className="text-2xl font-bold text-white text-center mb-8">{question.hint}</Text>

              {isAnswered ? (
                <View className="gap-3">
                  <View className={`p-4 rounded-xl border ${correct ? 'bg-green-500/20 border-green-500' : 'bg-red-500/20 border-red-500'}`}>
                    <Text className={`text-base ${correct ? 'text-green-400' : 'text-red-400'}`}>
                      내 답: {writtenInput || (state.status === 'answered-written' ? state.writtenAnswer : '')}
                    </Text>
                  </View>
                  {!correct && (
                    <View className="p-4 rounded-xl bg-green-500/20 border border-green-500">
                      <Text className="text-green-400 text-base">정답: {question.word.word}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="gap-3">
                  <TextInput
                    className="bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-xl text-white text-center"
                    placeholder="영어 단어를 입력하세요"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={writtenInput}
                    onChangeText={setWrittenInput}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  <TouchableOpacity
                    className="bg-primary rounded-xl py-4 items-center"
                    onPress={handleSubmit}
                    disabled={!writtenInput.trim()}
                  >
                    <Text className="text-white font-bold text-base">확인</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
