// =========================================================
// Каркас застосунку: шапка, сайдбар-drawer, одна активна сторінка.
// На відміну від pw-calc (там панелі змонтовані ПОСТІЙНО, бо legacy-модулі
// тримають DOM-слухачі) тут такої потреби нема — сторінки самі фетчать дані
// з Supabase при монтуванні, тож рендеримо рівно одну активну (перехід між
// вкладками = свіжий фетч, а не «застиглий» стан із моменту першого заходу).
// =========================================================

import { useCallback, useEffect, useState } from 'react';
import { useRoute } from '../app/useRoute';
import { useAuth } from '../app/useAuth';
import PageMeta from '../app/PageMeta';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';

import CalendarPage from '../pages/CalendarPage';
import AdminPage from '../pages/AdminPage';

const isMobile = () => window.matchMedia('(max-width: 880px)').matches;

export default function Layout() {
  const [route, setRoute] = useRoute();
  const { isAdmin } = useAuth();
  const [navOpen, setNavOpen] = useState(() => document.documentElement.classList.contains('nav-open'));

  const setOpen = useCallback((on: boolean) => {
    document.documentElement.classList.toggle('nav-open', on);
    setNavOpen(on);
  }, []);

  const navigate = useCallback(
    (tab: string) => {
      setRoute(tab);
      if (isMobile()) setOpen(false);
    },
    [setRoute, setOpen],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile() && document.documentElement.classList.contains('nav-open')) setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>('[data-goto]');
      if (a?.dataset.goto) {
        e.preventDefault();
        navigate(a.dataset.goto);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [setOpen, navigate]);

  return (
    <>
      <PageMeta route={route} />
      <Header navOpen={navOpen} onNavToggle={() => setOpen(!document.documentElement.classList.contains('nav-open'))} />
      <div className="nav-backdrop" aria-hidden="true" onClick={() => setOpen(false)}></div>
      <div className="app-shell container">
        <Sidebar route={route} isAdmin={isAdmin} onNavigate={navigate} />
        <div className="content">
          <main>{route === 'admin' ? <AdminPage /> : <CalendarPage />}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
