// =========================================================
// Публічний календар евентів: читання-only. Клік на подію показує
// деталі + записаного переможця (якщо адмін вже його вписав).
// =========================================================

import { useEffect, useMemo, useState } from 'react';
import type { EvtItem, EvtResult } from './events/types';
import { addDays, minToHM, MONTH_NOM, startOfWeek, ymd } from './events/dates';
import MonthView, { MCELL_PX } from './events/MonthView';
import WeekView, { HOUR_PX } from './events/WeekView';
import { fetchEvents, fetchResults, subscribeToEventChanges } from './events/dataStore';

type View = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [events, setEvents] = useState<EvtItem[]>([]);
  const [results, setResults] = useState<EvtResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => (window.matchMedia('(max-width: 880px)').matches ? 'day' : 'week'));
  const [anchor, setAnchor] = useState(() => new Date());
  const [cellPx, setCellPx] = useState(MCELL_PX);
  const [hourPx, setHourPx] = useState(HOUR_PX);
  const [selected, setSelected] = useState<{ evt: EvtItem; dateKey: string } | null>(null);

  async function load() {
    try {
      const [ev, res] = await Promise.all([fetchEvents(), fetchResults()]);
      setEvents(ev);
      setResults(res);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не вдалося завантажити евенти.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return subscribeToEventChanges(load);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    return Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i));
  }, [view, anchor]);

  const step = (dir: 1 | -1) => {
    if (view === 'month') setAnchor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
    else setAnchor((d) => addDays(d, dir * (view === 'week' ? 7 : 1)));
  };

  const activeResults = selected ? results.filter((r) => r.eventId === selected.evt.id && r.occurrenceDate === selected.dateKey) : [];

  // Групуємо по (evt, дата) — одна поява може мати кількох переможців (тімка, топ-N тощо).
  const recentGroups = useMemo(() => {
    const groups = new Map<string, { evt?: EvtItem; date: string; winners: EvtResult[] }>();
    for (const r of results) {
      const key = `${r.eventId}|${r.occurrenceDate}`;
      const g = groups.get(key) ?? { evt: events.find((e) => e.id === r.eventId), date: r.occurrenceDate, winners: [] };
      g.winners.push(r);
      groups.set(key, g);
    }
    return Array.from(groups.values())
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [results, events]);

  return (
    <div>
      <div className="section-head">
        <span className="eyebrow">Розклад</span>
        <h2>Календар евентів</h2>
        <p>Клікни на подію, щоб побачити деталі та переможця (якщо вже вписаний).</p>
      </div>

      {err && <p className="evt-form-err" style={{ marginBottom: 12 }}>{err}</p>}

      {recentGroups.length > 0 && (
        <div className="card" style={{ padding: 16, marginBottom: 18 }}>
          <h3 style={{ marginTop: 0 }}>🏆 Останні переможці</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentGroups.map(({ evt, date, winners }) => (
              <button
                key={`${evt?.id ?? 'x'}|${date}`}
                type="button"
                className="btn btn-ghost"
                style={{ justifyContent: 'space-between', width: '100%', textAlign: 'left', flexWrap: 'wrap', gap: 8 }}
                disabled={!evt}
                onClick={() => evt && setSelected({ evt, dateKey: date })}
              >
                <span>{evt ? `${evt.emoji} ${evt.title}` : '(евент видалено)'} · <span className="hint" style={{ display: 'inline' }}>{date}</span></span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {winners.map((w) => <span key={w.id} className="badge good">{w.winner}</span>)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-ghost" onClick={() => step(-1)}>←</button>
            <button type="button" className="btn btn-ghost" onClick={() => setAnchor(new Date())}>Сьогодні</button>
            <button type="button" className="btn btn-ghost" onClick={() => step(1)}>→</button>
          </div>
          <b>{view === 'month' ? `${MONTH_NOM[anchor.getMonth()]} ${anchor.getFullYear()}` : `${ymd(days[0])} — ${ymd(days[days.length - 1])}`}</b>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['month', 'week', 'day'] as View[]).map((v) => (
              <button key={v} type="button" className={'btn ' + (view === v ? 'btn-primary' : 'btn-ghost')} onClick={() => setView(v)}>
                {v === 'month' ? 'Місяць' : v === 'week' ? 'Тиждень' : 'День'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="hint">Завантаження…</p>
        ) : view === 'month' ? (
          <MonthView
            anchor={anchor}
            events={events}
            dragUi={null}
            cellPx={cellPx}
            onZoom={setCellPx}
            onDragStart={() => {}}
            onOpenEvent={(evt, dateKey) => setSelected({ evt, dateKey })}
            onOpenDay={(d) => { setAnchor(d); setView('day'); }}
            onCreateAt={() => {}}
          />
        ) : (
          <WeekView
            days={days}
            events={events}
            dragUi={null}
            hourPx={hourPx}
            dayFrom={0}
            dayTo={24}
            onZoom={setHourPx}
            onDragStart={() => {}}
            onOpenEvent={(evt, dateKey) => setSelected({ evt, dateKey })}
            onCreateAt={() => {}}
          />
        )}
      </div>

      {selected && (
        <div className="modal-overlay evt-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div className="modal evt-modal" role="dialog" aria-modal="true">
            <div className="modal-head">
              <h3>{selected.evt.emoji} {selected.evt.title}</h3>
              <button type="button" className="modal-close" aria-label="Закрити" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>
                <b>{selected.dateKey}</b> · {minToHM(selected.evt.start)}–{minToHM(selected.evt.start + selected.evt.duration)}
              </p>
              {selected.evt.notes && <p>{selected.evt.notes}</p>}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeResults.length > 0 ? (
                  activeResults.map((r) => (
                    <p key={r.id} className="badge good" style={{ display: 'inline-flex', width: 'fit-content' }}>
                      🏆 {r.winner}{r.notes ? ` — ${r.notes}` : ''}
                    </p>
                  ))
                ) : (
                  <p className="hint">Переможця ще не вписано.</p>
                )}
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Закрити</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
