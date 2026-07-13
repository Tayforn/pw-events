// =========================================================
// Адмінка: логін (Supabase Auth) + CRUD евентів + фіксація переможців.
// Доступ гейтиться і тут (UI), і на рівні RLS (is_admin() у Supabase) —
// навіть якщо хтось обійде UI, запис у БД все одно відхилиться.
// =========================================================

import { useEffect, useState } from 'react';
import { supabase } from '../app/supabaseClient';
import { useAuth } from '../app/useAuth';
import type { EvtItem, EvtResult } from './events/types';
import { minToHM, ymd } from './events/dates';
import EventModal from './events/EventModal';
import ConfirmModal, { type ConfirmState } from './events/ConfirmModal';
import { createEvent, createResult, deleteEvent, deleteResult, fetchEvents, fetchResults, updateEvent, updateResult } from './events/dataStore';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
    setBusy(false);
  };

  return (
    <div className="card" style={{ maxWidth: 380, margin: '40px auto' }}>
      <div className="section-head" style={{ marginBottom: 16 }}>
        <span className="eyebrow">Адмінка</span>
        <h2>Вхід</h2>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input type="password" value={password} required onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <p className="evt-form-err">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Вхід…' : 'Увійти'}</button>
      </form>
    </div>
  );
}

function newEmptyEvent(): EvtItem {
  return {
    id: crypto.randomUUID(),
    title: '',
    emoji: '',
    color: 'gold',
    start: 19 * 60,
    duration: 30,
    recur: { kind: 'once', date: ymd(new Date()) },
    order: 0,
  };
}

function AdminEvents() {
  const [events, setEvents] = useState<EvtItem[]>([]);
  const [results, setResults] = useState<EvtResult[]>([]);
  const [editing, setEditing] = useState<{ evt: EvtItem; isNew: boolean } | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [resultFor, setResultFor] = useState<{ evt: EvtItem; date: string } | null>(null);

  async function reload() {
    const [ev, res] = await Promise.all([fetchEvents(), fetchResults()]);
    setEvents(ev);
    setResults(res);
  }

  useEffect(() => {
    reload();
  }, []);

  const save = async (evt: EvtItem) => {
    if (editing?.isNew) await createEvent(evt);
    else await updateEvent(evt);
    setEditing(null);
    reload();
  };

  const remove = (evt: EvtItem) => {
    setConfirm({
      title: 'Видалити евент?',
      body: <p>«{evt.title}» — дію не можна скасувати.</p>,
      buttons: [
        { label: 'Скасувати', kind: 'ghost', onClick: () => setConfirm(null) },
        {
          label: 'Видалити', kind: 'danger', onClick: async () => {
            await deleteEvent(evt.id);
            setConfirm(null);
            setEditing(null);
            reload();
          },
        },
      ],
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Евенти</h3>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ evt: newEmptyEvent(), isNew: true })}>+ Новий евент</button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {events.length === 0 && <p className="hint" style={{ padding: 16 }}>Ще немає жодного евента.</p>}
        {events.map((evt) => (
          <div key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--line)' }}>
            <span className={`badge evt-c-${evt.color}`}>{evt.emoji} {evt.title}</span>
            <span className="hint" style={{ margin: 0 }}>
              {minToHM(evt.start)}–{minToHM(evt.start + evt.duration)} · {evt.recur.kind === 'weekly' ? 'щотижня' : `once: ${evt.recur.date}`}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setResultFor({ evt, date: ymd(new Date()) })}>🏆 Переможці</button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing({ evt, isNew: false })}>Редагувати</button>
              <button type="button" className="btn btn-ghost evt-btn-danger" onClick={() => remove(evt)}>Видалити</button>
            </span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 28 }}>
        <h3>Переможці — останні записи</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {results.length === 0 && <p className="hint" style={{ padding: 16 }}>Ще немає жодного запису.</p>}
          {results
            .slice()
            .sort((a, b) => (a.occurrenceDate < b.occurrenceDate ? 1 : -1))
            .map((r) => {
              const evt = events.find((e) => e.id === r.eventId);
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                  <span>{evt ? `${evt.emoji} ${evt.title}` : '(евент видалено)'}</span>
                  <span className="hint" style={{ margin: 0 }}>{r.occurrenceDate}</span>
                  <span className="badge good" style={{ marginLeft: 'auto' }}>🏆 {r.winner}</span>
                  <button type="button" className="btn btn-ghost evt-btn-danger" onClick={async () => { await deleteResult(r.id); reload(); }}>✕</button>
                </div>
              );
            })}
        </div>
      </div>

      {editing && (
        <EventModal
          initial={editing.evt}
          isNew={editing.isNew}
          onSave={save}
          onDelete={editing.isNew ? undefined : () => remove(editing.evt)}
          onClose={() => setEditing(null)}
        />
      )}
      {confirm && <ConfirmModal state={confirm} onClose={() => setConfirm(null)} />}
      {resultFor && (
        <WinnersModal
          evt={resultFor.evt}
          initialDate={resultFor.date}
          results={results}
          onClose={() => setResultFor(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

/** Кілька переможців можуть ділити одну появу евента — список + додавання +
 * інлайн-редагування/видалення кожного окремо, модалка лишається відкритою. */
function WinnersModal({ evt, initialDate, results, onClose, onChanged }: {
  evt: EvtItem; initialDate: string; results: EvtResult[]; onClose: () => void; onChanged: () => void;
}) {
  const [date, setDate] = useState(initialDate);
  const [winner, setWinner] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWinner, setEditWinner] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const forDate = results.filter((r) => r.eventId === evt.id && r.occurrenceDate === date);

  const add = async () => {
    if (!winner.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await createResult({ eventId: evt.id, occurrenceDate: date, winner: winner.trim(), notes: notes.trim() || undefined });
      setWinner('');
      setNotes('');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не вдалося зберегти.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: EvtResult) => {
    setEditingId(r.id);
    setEditWinner(r.winner);
    setEditNotes(r.notes ?? '');
  };

  const saveEdit = async () => {
    if (!editingId || !editWinner.trim()) return;
    setErr(null);
    try {
      await updateResult(editingId, { winner: editWinner.trim(), notes: editNotes.trim() || undefined });
      setEditingId(null);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не вдалося зберегти.');
    }
  };

  const remove = async (id: string) => {
    setErr(null);
    try {
      await deleteResult(id);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Не вдалося видалити.');
    }
  };

  return (
    <div className="modal-overlay evt-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal evt-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>Переможці — {evt.emoji} {evt.title}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body evt-form">
          <label className="evt-field">
            <span>Дата проведення</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          {forDate.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {forDate.map((r) =>
                editingId === r.id ? (
                  <div key={r.id} className="field-row">
                    <input type="text" value={editWinner} maxLength={120} onChange={(e) => setEditWinner(e.target.value)} />
                    <input type="text" value={editNotes} maxLength={200} placeholder="Нотатки" onChange={(e) => setEditNotes(e.target.value)} />
                    <button type="button" className="btn btn-primary" onClick={saveEdit}>OK</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setEditingId(null)}>✕</button>
                  </div>
                ) : (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge good" style={{ flex: 1 }}>🏆 {r.winner}{r.notes ? ` — ${r.notes}` : ''}</span>
                    <button type="button" className="btn btn-ghost" onClick={() => startEdit(r)}>Редагувати</button>
                    <button type="button" className="btn btn-ghost evt-btn-danger" onClick={() => remove(r.id)}>✕</button>
                  </div>
                ),
              )}
            </div>
          )}

          <div className="evt-form-row" style={{ alignItems: 'flex-end' }}>
            <label className="evt-field">
              <span>Новий переможець</span>
              <input type="text" value={winner} maxLength={120} placeholder="Нікнейм / гільдія" onChange={(e) => setWinner(e.target.value)} />
            </label>
            <label className="evt-field">
              <span>Нотатки</span>
              <input type="text" value={notes} maxLength={200} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <button type="button" className="btn btn-primary" disabled={busy || !winner.trim()} onClick={add}>Додати</button>
          </div>
          {err && <p className="evt-form-err">{err}</p>}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Закрити</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { session, isAdmin, loading } = useAuth();

  if (loading) return <p className="hint">Перевірка сесії…</p>;
  if (!session) return <LoginForm />;
  if (!isAdmin) {
    return (
      <div className="card">
        <p>Цей акаунт не має прав адміністратора.</p>
        <button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Вийти</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="section-head">
        <div>
          <span className="eyebrow">Адмінка</span>
          <h2>Керування евентами</h2>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Вийти</button>
      </div>
      <AdminEvents />
    </div>
  );
}
