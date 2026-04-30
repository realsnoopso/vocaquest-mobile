import { useState, useEffect, useCallback, useRef } from 'react';
import type { Word, QuizQuestion, QuizState, QuizSchedule, QuizType } from '@/lib/types';
import * as queries from '@/lib/queries';

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

export function useQuiz(intervalMinutes: number, quizType: QuizType = 'multiple-choice') {
  const [state, setState] = useState<QuizState>({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
  const [schedules, setSchedules] = useState<QuizSchedule[]>([]);
  const pausedUntilRef = useRef<number>(0);

  useEffect(() => {
    queries.getSchedules().then(setSchedules).catch(console.error);
  }, []);

  const triggerQuiz = useCallback(async () => {
    if (Date.now() < pausedUntilRef.current) return;
    if (!isWithinSchedule(schedules)) return;

    setState({ status: 'loading' });
    try {
      const words = await queries.getAllActiveWords();
      const question = generateQuestion(words, quizType);
      if (!question) {
        setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
        return;
      }
      setState({ status: 'presenting', question, startedAt: Date.now() });
    } catch {
      setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
    }
  }, [intervalMinutes, schedules, quizType]);

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
    setState({ status: 'idle', nextQuizAt: Date.now() + intervalMinutes * 60 * 1000 });
  }, [intervalMinutes]);

  const pause = useCallback((minutes: number) => {
    pausedUntilRef.current = Date.now() + minutes * 60 * 1000;
    dismiss();
  }, [dismiss]);

  return { state, triggerQuiz, answer, answerWritten, dismiss, pause };
}
