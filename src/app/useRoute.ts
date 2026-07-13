// =========================================================
// History-роутинг: /calendar, /admin. Той самий патерн, що й pw-calc
// (src/app/useRoute.ts), спрощений (без hash-редиректу — новий сайт).
// =========================================================

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TAB, VALID_TABS } from './routes';

export const APP_BASE: string = (() => {
  const b = import.meta.env.BASE_URL || '/';
  return b.endsWith('/') ? b : b + '/';
})();

function parsePath(): string {
  let p = location.pathname;
  if (p.startsWith(APP_BASE)) p = p.slice(APP_BASE.length);
  const name = p.replace(/^\/+|\/+$/g, '').split('/')[0].replace(/\.html$/, '');
  return VALID_TABS.includes(name) ? name : DEFAULT_TAB;
}

export function routeUrl(name: string): string {
  return APP_BASE + name;
}

export function useRoute(): [string, (name: string) => void] {
  const [route, setRouteState] = useState<string>(parsePath);

  useEffect(() => {
    if (location.pathname === APP_BASE || location.pathname === APP_BASE.slice(0, -1)) {
      history.replaceState(null, '', routeUrl(DEFAULT_TAB));
    }
    const onPop = () => setRouteState(parsePath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const setRoute = useCallback((name: string) => {
    if (!VALID_TABS.includes(name)) name = DEFAULT_TAB;
    if (parsePath() !== name) history.pushState(null, '', routeUrl(name));
    setRouteState(name);
  }, []);

  return [route, setRoute];
}
