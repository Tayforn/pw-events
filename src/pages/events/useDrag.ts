// =========================================================
// Розклад Евентів: типи для drag&drop-пропсів MonthView/WeekView.
// У pw-events (на відміну від pw-calc) drag-переміщення не реалізовано —
// цей файл лишає лише типи, щоб View-компоненти лишились портованими
// без змін. onDragStart-пропси у CalendarPage/AdminPage — no-op,
// dragUi завжди null. Якщо drag-to-move знадобиться пізніше — сюди
// можна портувати повну реалізацію з pw-calc (src/pages/events/useDrag.ts).
// =========================================================

import type { EvtColor } from './types';

export type DragPayload =
  | { kind: 'move'; evtId: string; fromDate: string; duration: number; emoji: string; title: string; color: EvtColor }
  | { kind: 'create' };

export interface DropTarget {
  date: string;
  startMin: number | null;
}

export interface DragUiState {
  payload: DragPayload;
  x: number;
  y: number;
  target: DropTarget | null;
}
