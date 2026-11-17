import type { Route } from '../ai/engine';
import { fmtMs, ROUTE_LABEL, routeText, routeVisible } from './format';

export { fmtMs, ROUTE_LABEL, routeText, routeVisible };

type Child = Node | string | number | false | null | undefined;
type Attrs = Record<string, string | number | boolean | EventListener | null | undefined> & {
  class?: string;
  dataset?: never;
};

/** Tiny element factory. `on*` attributes become listeners; booleans toggle attributes. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: (Child | Child[])[]) {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** For static, authored icon markup only. Never pass user or model text here. */
export function svg(markup: string): SVGElement {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild as SVGElement;
}

/**
 * Route note under an answer or report. Visible text is sentence case (`On this device, 412 ms`);
 * the aria-label keeps the spoken form (`ON DEVICE · 412 ms`). Demo engine notes say so.
 */
export function routeChip(route: Route, ms: number | undefined, demo: boolean): HTMLElement {
  return h(
    'span',
    {
      class: `chip chip--${route}`,
      'aria-label': `${routeText(route, ms)}${demo ? ' (demo engine)' : ''}`,
      title: demo ? 'Simulated by the demo engine' : undefined,
    },
    routeVisible(route, ms),
    demo ? h('span', { class: 'chip__demo' }, ' (demo)') : null,
  );
}

/** `<picture>` with webp + jpg for the photos in public/img. */
export function photo(name: string, alt: string, w: number, ht: number, opts: { cls?: string; eager?: boolean } = {}): HTMLElement {
  const base = `${import.meta.env.BASE_URL}img/${name}`;
  return h(
    'picture',
    { class: opts.cls },
    h('source', { srcset: `${base}.webp`, type: 'image/webp' }),
    h('img', {
      src: `${base}.jpg`,
      alt,
      width: w,
      height: ht,
      decoding: 'async',
      loading: opts.eager ? undefined : 'lazy',
      fetchpriority: opts.eager ? 'high' : undefined,
    }),
  );
}

export const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
