export interface WordList {
  id: string;
  user_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WordListWithCount extends WordList {
  word_count: number;
}

export interface Word {
  id: string;
  word_list_id: string;
  user_id: string;
  word: string;
  pronunciation: string | null;
  primary_meaning: string | null;
  meaning_kr: string | null;
  primary_pos: string | null;
  meanings: WordMeaning[];
  etymology: WordEtymology;
  mastered: boolean;
  llm_generated: boolean;
  llm_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface WordMeaning {
  pos: string;
  meaning_kr: string;
  example: string;
}

export interface WordEtymology {
  origin_language: string;
  origin_word: string;
  origin_meaning: string;
  compounds: { part: string; meaning: string }[];
  explanation: string;
  similar_words: string[];
}

export interface QuizResult {
  id: string;
  user_id: string;
  word_id: string;
  word_list_id: string;
  correct: boolean;
  selected_answer: string;
  answered_at: string;
}

export type MeaningDisplay = 'both' | 'synonyms' | 'korean';
export type QuizType = 'multiple-choice' | 'written' | 'fill-in-blank';

export interface UserSettings {
  user_id: string;
  quiz_interval_minutes: number;
  sound_enabled: boolean;
  notifications_enabled: boolean;
  meaning_display: MeaningDisplay;
  quiz_type: QuizType;
  created_at: string;
  updated_at: string;
}

export interface QuizSchedule {
  id: string;
  user_id: string;
  days: boolean[];
  start_hour: number;
  end_hour: number;
  enabled: boolean;
  created_at: string;
}

export type QuizQuestion =
  | { type: 'multiple-choice'; word: Word; choices: string[]; correctIndex: number }
  | { type: 'written'; word: Word; hint: string }
  | { type: 'fill-in-blank'; word: Word; sentence: string; prefix: string; answer: string };

export type QuizState =
  | { status: 'idle'; nextQuizAt: number }
  | { status: 'loading' }
  | { status: 'presenting'; question: QuizQuestion; startedAt: number }
  | { status: 'answered'; question: QuizQuestion; selectedIndex: number; correct: boolean }
  | { status: 'answered-written'; question: QuizQuestion; writtenAnswer: string; correct: boolean }
  | { status: 'result'; question: QuizQuestion; correct: boolean };

export interface AddWordsResult {
  total: number;
  added: number;
  duplicates: number;
  errors: string[];
}
