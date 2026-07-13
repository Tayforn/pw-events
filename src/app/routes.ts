// =========================================================
// Роути застосунку. Джерело правди — routes.meta.json.
// =========================================================

import META from './routes.meta.json';

export interface RouteDef {
  id: string;
  label: string;
  title: string;
  description: string;
}

export const ROUTES: RouteDef[] = META as RouteDef[];
export const ROUTE_BY_ID: Record<string, RouteDef> = Object.fromEntries(ROUTES.map((r) => [r.id, r]));
export const VALID_TABS = ROUTES.map((r) => r.id);
export const DEFAULT_TAB = 'calendar';
