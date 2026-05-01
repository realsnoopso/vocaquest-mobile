import { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, QuizQuestion, QuizState, QuizSchedule, QuizType } from '@/lib/types';
import * as queries from '@/lib/queries';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

function isWithinSchedule(schedules: QuizSchedule[]): boolean {
  if (schedules.length === 0) return true;
  const now = new Date();
  const hour = now.getHours();
  const jsDay = now.getDay();
  const dayIndex = jsDay === 0 ? 6 : jsDay - 1;

  return schedules.filter((s) => s.enabled).some((s) => {
    if (!s.days[dayIndex]) return false;
    if (s.start_hour <= s.end_hour) {
      return hour >= s.start_hour && hour < s.end_hour;
    }
    return hour >= s.start_hour || hour < s.end_hour;
  });
}

function generateQuestion(words: Word[], quizType: QuizType = 'multiple-choice'): QuizQuestion | null {
  const eligible = words.filter((w) => w.llm_generated && w.primary_meaning);

  if (quizType === 'fill-in-blank') {
    const withExamples = eligible.filter((w) =>
      w.word.length >= 4 &&
      w.meanings?.some((m) =>
        m.example && m.example.toLowerCase().includes(w.word.toLowerCase())
      )
    );
    if (withExamples.length < 1) return null;

    const shuffled = [...withExamples].sort(() => Math.random() - 0.5);
    const correctWord = shuffled[0];
    const meaning = correctWord.meanings.find((m) =>
      m.example && m.example.toLowerCase().includes(correctWord.word.toLowerCase())
    )!;

    const prefixLen = correctWord.word.length < 6 ? 2 : 3;
    const prefix = correctWord.word.slice(0, prefixLen);
    const answer = correctWord.word.slice(prefixLen);
    const blanks = Array(correctWord.word.length - prefixLen).fill('_').join(' ');
    const escaped = correctWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sentence = meaning.example.replace(new RegExp(escaped, 'i'), prefix + blanks);

    return { type: 'fill-in-blank', word: correctWord, sentence, prefix, answer };
  }

  if (quizType === 'written') {
    if (eligible.length < 1) return null;
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const correctWord = shuffled[0];
    const hint = correctWord.meaning_kr
      ? `${correctWord.primary_meaning} (${correctWord.meaning_kr})`
      : correctWord.primary_meaning!;
    return { type: 'written', word: correctWord, hint };
  }

  if (eligible.length < 4) return null;
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const correctWord = shuffled[0];
  const wrongWords = shuffled.slice(1, 4);

  const choices = [
    correctWord.primary_meaning!,
    ...wrongWords.map((w) => w.primary_meaning!),
  ].sort(() => Math.random() - 0.5);

  return {
    type: 'multiple-choice',
    word: correctWord,
    choices,
    correctIndex: choices.indexOf(correctWord.primary_meaning!),
  };
}

export function getMinWordsForType(quizType: QuizType): number {
  switch (quizType) {
    case 'multiple-choice': return 4;
    case 'written': return 1;
    case 'fill-in-blank': return 1;
  }
}

export interface QuizStats {
  totalActive: number;
  unmastered: number;
  mastered: number;
}

const ts = () => new Date().toISOString().split('T')[1].slice(0, 12);

export function useQuiz(intervalMinutes: number, quizType: QuizType = 'multiple-choice') {
  const [state, setState] = useState<QuizState>({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
  const [schedules, setSchedules] = useState<QuizSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStats>({ totalActive: 0, unmastered: 0, mastered: 0 });
  const quizzedCountRef = useRef(0);
  const pausedUntilRef = useRef<number>(0);

  const debug = useCallback((msg: string) => {
    setDebugLog((prev) => [...prev.slice(-50), `[${ts()}] ${msg}`]);
  }, []);

  useEffect(() => {
    queries.getSchedules().then(setSchedules).catch((e) => {
      debug(`❌ getSchedules 실패: ${e?.message || String(e)}`);
    });
  }, []);

  const triggerQuiz = useCallback(async () => {
    debug('▶️ triggerQuiz 호출됨');

    // Step 1: Check pause
    if (Date.now() < pausedUntilRef.current) {
      const remain = Math.ceil((pausedUntilRef.current - Date.now()) / 60000);
      debug(`⏸️ 일시정지 중 (${remain}분 남음)`);
      return;
    }
    debug('✅ pause 체크 통과');

    // Step 2: Check schedule
    if (!isWithinSchedule(schedules)) {
      const now = new Date();
      debug(`🕐 스케줄 범위 밖 (현재: ${now.getHours()}시, schedules: ${JSON.stringify(schedules.map(s => ({enabled:s.enabled, start:s.start_hour, end:s.end_hour, days:s.days})))}`);
      return;
    }
    debug(`✅ schedule 체크 통과 (schedules: ${schedules.length}개)`);

    // Step 3: Show Supabase connection info
    const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const supabaseKeyMasked = (Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').slice(0, 20) + '...';
    debug(`🔗 Supabase URL: ${supabaseUrl}`);
    debug(`🔑 Supabase Key: ${supabaseKeyMasked}`);

    setError(null);
    setState({ status: 'loading' });
    debug('⏳ 상태: loading');

    // Step 4: Test raw Supabase connection
    try {
      const { data: testData, error: testError } = await supabase.from('word_lists').select('id', { count: 'exact', head: true });
      if (testError) {
        debug(`❌ Supabase 연결 실패: ${testError.message} (코드: ${testError.code})`);
        setError(`Supabase 연결 실패: ${testError.message}`);
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }
      debug(`✅ Supabase 연결 성공`);
    } catch (e: any) {
      debug(`❌ Supabase 연결 예외: ${e?.message || String(e)}`);
      setError(`Supabase 연결 예외: ${e?.message || String(e)}`);
      setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
      return;
    }

    // Step 5: Fetch active word lists
    try {
      const { data: activeLists } = await supabase.from('word_lists').select('id').eq('active', true);
      debug(`📋 활성 단어장: ${activeLists?.length || 0}개`);
      
      if (!activeLists?.length) {
        debug('❌ 활성 단어장이 없음');
        setError('활성화된 단어장이 없어요. 단어장 탭에서 활성화해주세요.');
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }

      const listIds = activeLists.map((l: { id: string }) => l.id);
      debug(`📋 단어장 ID: ${listIds.map((id: string) => id.slice(0, 8)).join(', ')}`);

      // Step 6: Fetch words
      const { data: allWords, error: wordsError } = await supabase
        .from('words')
        .select('*')
        .in('word_list_id', listIds)
        .eq('mastered', false);
      
      if (wordsError) {
        debug(`❌ 단어 조회 실패: ${wordsError.message}`);
        setError(`단어 조회 실패: ${wordsError.message}`);
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }

      const words = allWords || [];
      debug(`📝 조회된 단어 (mastered=false): ${words.length}개`);

      // Fetch total word count for stats
      const { count: totalCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .in('word_list_id', listIds);
      
      const totalActive = totalCount || 0;
      const unmastered = words.filter((w: Word) => w.llm_generated && w.primary_meaning).length;
      const mastered = totalActive - words.length;
      setQuizStats({ totalActive, unmastered, mastered });
      debug(`📊 통계: 총 ${totalActive}개 / 미학습 ${unmastered}개 / 마스터 ${mastered}개`);

      // Step 7: Filter eligible
      const eligibleWords = words.filter((w: Word) => w.llm_generated && w.primary_meaning);
      debug(`🎯 eligible 단어 (llm_generated + meaning): ${eligibleWords.length}개`);
      
      if (eligibleWords.length > 0) {
        debug(`   샘플: ${eligibleWords.slice(0, 3).map((w: Word) => `${w.word}=${w.primary_meaning?.slice(0, 20)}`).join(', ')}`);
      }

      const minWords = getMinWordsForType(quizType);
      if (eligibleWords.length < minWords) {
        debug(`❌ 최소 ${minWords}개 필요, 현재 ${eligibleWords.length}개`);
        setError(
          quizType === 'multiple-choice'
            ? `객관식 퀴즈는 최소 ${minWords}개의 학습 가능한 단어가 필요해요. (현재: ${eligibleWords.length}개)`
            : '학습 가능한 단어가 없어요.'
        );
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }
      debug(`✅ 단어 개수 충분 (${eligibleWords.length} >= ${minWords})`);

      // Step 8: Generate question
      const question = generateQuestion(words, quizType);
      if (!question) {
        debug('❌ generateQuestion이 null 반환');
        setError('퀴즈를 생성할 수 없어요.');
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }
      debug(`✅ 퀴즈 생성됨: type=${question.type}, word="${question.word.word}"`);

      setState({ status: 'presenting', question, startedAt: Date.now() });
      debug('🎉 퀴즈 시작!');

    } catch (e: any) {
      debug(`💥 예외 발생: ${e?.message || String(e)}`);
      debug(`   stack: ${e?.stack?.slice(0, 200) || 'none'}`);
      setError(`오류: ${e?.message || String(e)}`);
      setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
    }
  }, [intervalMinutes, schedules, quizType, debug]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.status === 'idle') {
          triggerQuiz();
        }
        return prev;
      });
    }, intervalMinutes * 60 * 1000);
    return () => clearInterval(timer);
  }, [intervalMinutes, triggerQuiz]);

  const answer = useCallback(async (selectedIndex: number) => {
    if (state.status !== 'presenting' || state.question.type !== 'multiple-choice') return;
    const correct = selectedIndex === state.question.correctIndex;
    setState({ status: 'answered', question: state.question, selectedIndex, correct });

    queries.saveQuizResult({
      word_id: state.question.word.id,
      word_list_id: state.question.word.word_list_id,
      correct,
      selected_answer: state.question.choices[selectedIndex],
    }).catch(console.error);

    setTimeout(() => {
      setState({ status: 'result', question: state.question, correct });
    }, correct ? 800 : 1200);
  }, [state]);

  const answerWritten = useCallback(async (writtenAnswer: string) => {
    if (state.status !== 'presenting' || (state.question.type !== 'written' && state.question.type !== 'fill-in-blank')) return;
    const correct = state.question.type === 'fill-in-blank'
      ? writtenAnswer.trim().toLowerCase() === state.question.answer.toLowerCase()
      : writtenAnswer.trim().toLowerCase() === state.question.word.word.toLowerCase();
    setState({ status: 'answered-written', question: state.question, writtenAnswer, correct });

    queries.saveQuizResult({
      word_id: state.question.word.id,
      word_list_id: state.question.word.word_list_id,
      correct,
      selected_answer: writtenAnswer.trim(),
    }).catch(console.error);

    setTimeout(() => {
      setState({ status: 'result', question: state.question, correct });
    }, correct ? 800 : 1200);
  }, [state]);

  const dismiss = useCallback(() => {
    quizzedCountRef.current += 1;
    setError(null);
    setDebugLog([]);
    setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
  }, [intervalMinutes]);

  const pause = useCallback((minutes: number) => {
    pausedUntilRef.current = Date.now() + minutes * 60 * 1000;
    dismiss();
  }, [dismiss]);

  return { state, error, debugLog, quizStats, quizzedCount: quizzedCountRef.current, triggerQuiz, answer, answerWritten, dismiss, pause };
}
