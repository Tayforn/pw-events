// =========================================================
// Сайдбар: Календар (публічний) + Адмінка (пункт меню — лише коли
// вже залогинений як адмін; сам /admin route все одно доступний
// напряму за URL для входу).
// =========================================================

import type { ReactNode } from 'react';

interface NavEntry {
  tab: string;
  label: string;
  ico: ReactNode;
  adminOnly?: boolean;
}

const S = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const NAV: NavEntry[] = [
  {
    tab: 'calendar', label: 'Календар',
    ico: <svg {...S}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /><circle cx="8.2" cy="13.5" r=".8" /><circle cx="12" cy="13.5" r=".8" /><circle cx="15.8" cy="13.5" r=".8" /></svg>,
  },
  {
    tab: 'admin', label: 'Адмінка', adminOnly: true,
    ico: <svg {...S}><circle cx="12" cy="8" r="3.2" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></svg>,
  },
];

interface Props {
  route: string;
  isAdmin: boolean;
  onNavigate: (tab: string) => void;
}

export default function Sidebar({ route, isAdmin, onNavigate }: Props) {
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);
  return (
    <aside className="sidebar" id="appSidebar">
      <nav className="nav-primary" role="tablist" aria-label="Розділи">
        {items.map((n) => (
          <button
            key={n.tab}
            className={'tab' + (n.tab === route ? ' active' : '')}
            role="tab"
            aria-selected={n.tab === route}
            onClick={() => onNavigate(n.tab)}
          >
            <span className="tab-ico">{n.ico}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
