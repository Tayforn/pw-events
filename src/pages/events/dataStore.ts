// =========================================================
// Розклад Евентів: шар даних Supabase (заміна localStorage store.ts
// з pw-calc). Rows у БД — snake_case; EvtItem/EvtResult — camelCase.
// =========================================================

import { supabase } from '../../app/supabaseClient';
import type { EvtItem, EvtResult } from './types';

interface EventRow {
  id: string;
  title: string;
  emoji: string | null;
  color: string;
  start_min: number;
  duration_min: number;
  recur_kind: 'once' | 'weekly';
  recur_date: string | null;
  recur_days_mask: number | null;
  skip_dates: string[] | null;
  notes: string | null;
}

interface ResultRow {
  id: string;
  event_id: string;
  occurrence_date: string;
  winner: string;
  notes: string | null;
}

function rowToEvt(r: EventRow): EvtItem {
  return {
    id: r.id,
    title: r.title,
    emoji: r.emoji ?? '',
    color: (r.color as EvtItem['color']) || 'gold',
    start: r.start_min,
    duration: r.duration_min,
    recur: r.recur_kind === 'weekly' ? { kind: 'weekly', days: r.recur_days_mask ?? 0 } : { kind: 'once', date: r.recur_date ?? '' },
    skipDates: r.skip_dates ?? [],
    notes: r.notes ?? undefined,
    order: 0,
  };
}

function evtToRow(e: EvtItem): Omit<EventRow, 'id'> & { id: string } {
  return {
    id: e.id,
    title: e.title,
    emoji: e.emoji || null,
    color: e.color,
    start_min: e.start,
    duration_min: e.duration,
    recur_kind: e.recur.kind,
    recur_date: e.recur.kind === 'once' ? e.recur.date : null,
    recur_days_mask: e.recur.kind === 'weekly' ? e.recur.days : null,
    skip_dates: e.skipDates ?? [],
    notes: e.notes ?? null,
  };
}

function rowToResult(r: ResultRow): EvtResult {
  return { id: r.id, eventId: r.event_id, occurrenceDate: r.occurrence_date, winner: r.winner, notes: r.notes ?? undefined };
}

export async function fetchEvents(): Promise<EvtItem[]> {
  const { data, error } = await supabase.from('events').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EventRow[]).map(rowToEvt);
}

export async function fetchResults(): Promise<EvtResult[]> {
  const { data, error } = await supabase.from('event_results').select('*');
  if (error) throw error;
  return (data as ResultRow[]).map(rowToResult);
}

export async function createEvent(evt: EvtItem): Promise<EvtItem> {
  const { data, error } = await supabase.from('events').insert(evtToRow(evt)).select().single();
  if (error) throw error;
  return rowToEvt(data as EventRow);
}

export async function updateEvent(evt: EvtItem): Promise<void> {
  const { id, ...row } = evtToRow(evt);
  const { error } = await supabase.from('events').update(row).eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

/** Кілька переможців можуть ділити одну появу евента (тімка, топ-3 тощо) — кожен
 * окремим рядком, тому додавання — це insert, а не upsert по (event_id, date). */
export async function createResult(res: { eventId: string; occurrenceDate: string; winner: string; notes?: string }): Promise<void> {
  const { error } = await supabase.from('event_results').insert({
    event_id: res.eventId,
    occurrence_date: res.occurrenceDate,
    winner: res.winner,
    notes: res.notes || null,
  });
  if (error) throw error;
}

export async function updateResult(id: string, fields: { winner: string; notes?: string }): Promise<void> {
  const { error } = await supabase.from('event_results').update({ winner: fields.winner, notes: fields.notes || null }).eq('id', id);
  if (error) throw error;
}

export async function deleteResult(id: string): Promise<void> {
  const { error } = await supabase.from('event_results').delete().eq('id', id);
  if (error) throw error;
}

/** Живі оновлення: будь-яка зміна events/event_results викликає onChange (просто рефетч). */
export function subscribeToEventChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('events-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_results' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
