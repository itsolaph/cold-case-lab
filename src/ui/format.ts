import type { Route } from '../ai/engine';

export function fmtMs(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

export const ROUTE_LABEL: Record<Route, string> = {
  'on-device': 'On device',
  'remote-line': 'Remote line',
  'cloud-lab': 'Cloud lab',
};

/** Plain-text route label as read aloud (the chip's aria-label): `ON DEVICE · 412 ms`. */
export function routeText(route: Route, ms?: number): string {
  const label = ROUTE_LABEL[route].toUpperCase();
  return ms === undefined ? label : `${label} · ${fmtMs(ms)}`;
}

/** What the chip shows on screen, in sentence case: `On this device, 412 ms`. */
export const ROUTE_VISIBLE: Record<Route, string> = {
  'on-device': 'On this device',
  'remote-line': 'Remote line',
  'cloud-lab': 'Lab',
};

export function routeVisible(route: Route, ms?: number): string {
  return ms === undefined ? ROUTE_VISIBLE[route] : `${ROUTE_VISIBLE[route]}, ${fmtMs(ms)}`;
}
