import { supabase } from './supabase';
import type { WordList, WordListWithCount, Word, QuizResult, UserSettings, QuizSchedule } from './types';

// Fixed user ID for single-user mode (shared with desktop)
const FIXED_USER_ID = '9a266ca9-dc11-4cae-ba1c-d58c0ea854f6';

// ============ Word Lists ============
export async function getWordLists(): Promise<WordListWithCount[]> {
  const { data, error } = await supabase
    .from('word_lists')
    .select('*, words(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((list: WordList & { words: { count: number }[] }) => ({
    ...list,
    word_count: list.words?.[0]?.count || 0,
  }));
}

export async function createWordList(name: string, description?: string) {
  const { data, error } = await supabase
    .from('word_lists')
    .insert({ name, description: description || '', user_id: FIXED_USER_ID })
    .select()
    .single();

  if (error) throw error;
  return data as WordList;
}

export async function updateWordList(id: string, updates: Partial<Pick<WordList, 'name' | 'description' | 'active'>>) {
  const { data, error } = await supabase
    .from('word_lists')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as WordList;
}

export async function deleteWordList(id: string) {
  const { error } = await supabase.from('word_lists').delete().eq('id', id);
  if (error) throw error;
}

// ============ Words ============
export async function getWords(listId: string): Promise<Word[]> {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('word_list_id', listId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getAllActiveWords(): Promise<Word[]> {
  const { data: activeLists } = await supabase
    .from('word_lists')
    .select('id')
    .eq('active', true);

  if (!activeLists?.length) return [];

  const listIds = activeLists.map((l: { id: string }) => l.id);
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .in('word_list_id', listIds)
    .eq('llm_generated', true)
    .eq('mastered', false);

  if (error) throw error;
  return data || [];
}

export async function addWord(word: string, listId: string, meaning?: string) {
  const insert: Record<string, unknown> = {
    word: word.trim().toLowerCase(),
    word_list_id: listId,
    user_id: FIXED_USER_ID,
  };

  if (meaning) {
    insert.primary_meaning = meaning.trim();
    insert.llm_generated = true;
  }

  const { data, error } = await supabase
    .from('words')
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as Word;
}

export async function bulkAddWords(words: string[], listId: string) {
  const uniqueWords = [...new Set(words.map((w) => w.trim().toLowerCase()).filter(Boolean))];

  const { data, error } = await supabase
    .from('words')
    .upsert(
      uniqueWords.map((word) => ({ word, word_list_id: listId, user_id: FIXED_USER_ID })),
      { onConflict: 'word_list_id,word', ignoreDuplicates: true }
    )
    .select();

  return {
    total: words.length,
    added: data?.length || 0,
    duplicates: words.length - (data?.length || 0),
    errors: error ? [error.message] : [],
  };
}

export async function deleteWord(id: string) {
  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) throw error;
}

export async function setWordMastered(id: string, mastered: boolean) {
  const { error } = await supabase.from('words').update({ mastered }).eq('id', id);
  if (error) throw error;
}

export async function resetListProgress(listId: string) {
  const { error } = await supabase.from('words').update({ mastered: false }).eq('word_list_id', listId);
  if (error) throw error;
}

// ============ Quiz Results ============
export async function saveQuizResult(result: {
  word_id: string;
  word_list_id: string;
  correct: boolean;
  selected_answer: string;
}) {
  const { error } = await supabase.from('quiz_results').insert({ ...result, user_id: FIXED_USER_ID });
  if (error) throw error;
}

// ============ Settings ============
export async function getSettings(): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSettings(settings: Partial<Omit<UserSettings, 'user_id' | 'created_at' | 'updated_at'>>) {
  const existing = await getSettings();
  const userId = existing?.user_id || FIXED_USER_ID;

  const { data, error } = await supabase
    .from('user_settings')
    .upsert({ ...settings, user_id: userId }, { onConflict: 'user_id' })
    .select()
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as UserSettings;
}

// ============ Schedules ============
export async function getSchedules(): Promise<QuizSchedule[]> {
  const { data, error } = await supabase
    .from('quiz_schedules')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}
