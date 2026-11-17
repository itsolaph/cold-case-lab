import type { Route } from '../ai/engine';

export function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export const ROUTE_LABEL: Record<Route, string> = {
  'on-device': 'On device',
  'remote-line': 'Remote line',
  'cloud-lab': 'Cloud lab',
};

/** Plain-text route label as read aloud / shown in the chip: `ON DEVICE · 412 ms`. */
export function routeText(route: Route, ms?: number): string {
  const label = ROUTE_LABEL[route].toUpperCase();
  return ms === undefined ? label : `${label} · ${fmtMs(ms)}`;
}
