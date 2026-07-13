// =========================================================
// Розклад Евентів: типи даних (портовано з pw-calc, без нагадувань/звуку —
// це вже не локальний пристрій, дані спільні через Supabase).
// Час зберігаємо як wall-clock (хвилини від локальної опівночі).
// =========================================================

/** Бітова маска днів тижня: біт 0 = Пн … біт 6 = Нд. */
export type WeekdayMask = number;

export const ALL_DAYS: WeekdayMask = 0b1111111;

export type EvtColor = 'gold' | 'sky' | 'green' | 'red' | 'violet' | 'orange';

export const EVT_COLORS: EvtColor[] = ['gold', 'sky', 'green', 'red', 'violet', 'orange'];

export type EvtRecur =
  | { kind: 'once'; date: string } // 'YYYY-MM-DD'
  | { kind: 'weekly'; days: WeekdayMask };

export interface EvtItem {
  id: string;
  title: string;
  emoji: string;
  color: EvtColor;
  /** Початок: хвилини від опівночі, крок 5 хв. */
  start: number;
  /** Тривалість у хвилинах, min 5; start + duration <= 1440 (без переходу через північ). */
  duration: number;
  recur: EvtRecur;
  /** Видалені окремі дні weekly-серії ('YYYY-MM-DD'). */
  skipDates?: string[];
  notes?: string;
  /** Порядок у стосі при однаковому старті (менший = вище). */
  order: number;
}

/** Конкретна поява евента в конкретний день. */
export interface Occ {
  evt: EvtItem;
  dateKey: string; // 'YYYY-MM-DD'
  startMin: number;
  endMin: number;
}

/** Переможець конкретної появи (event_results у Supabase). */
export interface EvtResult {
  id: string;
  eventId: string;
  occurrenceDate: string; // 'YYYY-MM-DD'
  winner: string;
  notes?: string;
}
