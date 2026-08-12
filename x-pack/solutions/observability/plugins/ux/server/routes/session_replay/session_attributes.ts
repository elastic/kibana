/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SessionAction,
  SessionActivityBucket,
  SessionClient,
  SessionUser,
} from '../../../common/session_replay';

export interface OtelHit {
  _source?: Record<string, unknown>;
}

const getNested = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;

/**
 * Read a dotted attribute from an OTel ES hit. EDOT stores attributes as an object
 * keyed by flat dotted names (`attributes['http.url']`), but may also appear nested
 * (`attributes.page.url.path`) or hoisted to root dotted keys depending on mapping,
 * and in doc or resource scope — so try all shapes.
 */
export const attrString = (source: Record<string, unknown>, path: string): string | null => {
  const attributes = asRecord(source.attributes);
  const resourceAttributes = asRecord(asRecord(source.resource)?.attributes);
  const candidates = [
    attributes?.[path],
    resourceAttributes?.[path],
    source[`attributes.${path}`],
    source[`resource.attributes.${path}`],
    getNested(source, `attributes.${path}`),
    getNested(source, `resource.attributes.${path}`),
    getNested(source, path),
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }
  return null;
};

export const attrNumber = (source: Record<string, unknown>, path: string): number | null => {
  const raw = attrString(source, path);
  if (raw == null) {
    return null;
  }
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

export const attrBool = (source: Record<string, unknown>, path: string): boolean | null => {
  const raw = attrString(source, path);
  if (raw == null) {
    return null;
  }
  return raw === 'true' || raw === '1';
};

export const docName = (source: Record<string, unknown>): string | null => {
  const name = source.name ?? source.event_name;
  return typeof name === 'string' ? name : null;
};

export const docTimestamp = (source: Record<string, unknown>): string | null => {
  const ts = source['@timestamp'];
  return typeof ts === 'string' ? ts : null;
};

/** Normalize a raw URL into a page label: hash route when present, else pathname. */
export const toPageLabel = (raw: string | null): string | null => {
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw, 'http://local');
    const fragment = url.hash.replace(/^#\/?/, '');
    if (fragment) {
      return `#${fragment}`;
    }
    return url.pathname || '/';
  } catch {
    if (raw.startsWith('/') || raw.startsWith('#')) {
      return raw.split('?')[0] ?? raw;
    }
    return raw;
  }
};

export const pageFromHit = (source: Record<string, unknown>): string | null =>
  toPageLabel(attrString(source, 'page.url.path')) ||
  toPageLabel(attrString(source, 'page.url')) ||
  toPageLabel(attrString(source, 'url.full')) ||
  toPageLabel(attrString(source, 'http.url'));

export const urlFromHit = (source: Record<string, unknown>): string | null =>
  attrString(source, 'page.url') ||
  attrString(source, 'url.full') ||
  attrString(source, 'http.url');

export const isAssetPath = (page: string | null): boolean =>
  Boolean(page) &&
  (/\/assets\//.test(page!) || /\.(js|css|map|png|jpe?g|svg|gif|woff2?|ico)(\?|$)/i.test(page!));

const ACTIVITY_ID_LABELS: Record<string, string> = {
  checkout: 'Checkout',
  'save-account': 'Save profile',
  'send-support': 'Send support',
  'open-help': 'Open help',
  'close-help': 'Close help',
  'clear-cart': 'Clear cart',
  search: 'Search',
  category: 'Filter category',
  email: 'Edit email',
  name: 'Edit name',
  plan: 'Select plan',
  topic: 'Select topic',
  message: 'Edit message',
};

const NAV_TABS = ['Catalog', 'Cart', 'Account', 'Support'];

export const labelFromXPath = (xpath: string | null): string | null => {
  if (!xpath) {
    return null;
  }
  const idMatch = xpath.match(/@id="([^"]+)"/);
  if (idMatch?.[1]) {
    return ACTIVITY_ID_LABELS[idMatch[1]] ?? idMatch[1];
  }
  if (xpath.includes('product-grid') || xpath.includes('data-add')) {
    return 'Add to cart';
  }
  if (xpath.includes('data-remove') || xpath.includes('cart-list')) {
    return 'Remove item';
  }
  const navMatch = xpath.match(/\/nav\/button(?:\[(\d+)\])?/);
  if (navMatch) {
    const index = navMatch[1] ? Number(navMatch[1]) : 1;
    return NAV_TABS[index - 1] ?? 'Navigate';
  }
  return null;
};

export const isErrorHit = (source: Record<string, unknown>): boolean => {
  const name = docName(source);
  if (name === 'exception') {
    return true;
  }
  return (
    attrString(source, 'event.outcome') === 'failure' ||
    attrString(source, 'log.level') === 'ERROR' ||
    attrString(source, 'error.type') != null ||
    attrString(source, 'exception.type') != null
  );
};

export const dedupeConsecutive = (items: string[]): string[] => {
  const out: string[] = [];
  for (const item of items) {
    if (item && out[out.length - 1] !== item) {
      out.push(item);
    }
  }
  return out;
};

export const userFromHits = (hits: OtelHit[]): SessionUser => {
  const user: SessionUser = { id: null, email: null, name: null };
  for (const hit of hits) {
    const source = hit._source ?? {};
    user.id = user.id ?? attrString(source, 'user.id');
    user.email = user.email ?? attrString(source, 'user.email');
    user.name = user.name ?? attrString(source, 'user.name');
    if (user.id && user.email && user.name) {
      break;
    }
  }
  return user;
};

export const clientFromHits = (hits: OtelHit[]): SessionClient => {
  const client: SessionClient = {
    browser: null,
    os: null,
    device: null,
    mobile: null,
    country: null,
  };
  for (const hit of hits) {
    const source = hit._source ?? {};
    if (!client.browser) {
      const name = attrString(source, 'browser.name') || attrString(source, 'user_agent.name');
      const version = attrString(source, 'browser.version');
      client.browser = name ? (version ? `${name} ${version.split('.')[0]}` : name) : null;
    }
    client.os =
      client.os || attrString(source, 'os.name') || attrString(source, 'browser.platform');
    client.device =
      client.device || attrString(source, 'device.model.name') || attrString(source, 'device.type');
    if (client.mobile == null) {
      client.mobile = attrBool(source, 'browser.mobile');
    }
    client.country =
      client.country ||
      attrString(source, 'client.geo.country_name') ||
      attrString(source, 'geo.country_name');
    if (client.browser && client.os && client.country) {
      break;
    }
  }
  return client;
};

/** Rage clicks = >= 3 clicks on the same target within a 1s window. */
export const countRageClicks = (clicks: Array<{ xpath: string | null; ts: number }>): number => {
  let rage = 0;
  let runStart = 0;
  let runCount = 0;
  let runKey: string | null = null;
  let counted = false;

  for (const click of clicks) {
    const key = click.xpath ?? '∅';
    if (key === runKey && click.ts - runStart <= 1000) {
      runCount += 1;
      if (runCount >= 3 && !counted) {
        rage += 1;
        counted = true;
      }
    } else {
      runKey = key;
      runStart = click.ts;
      runCount = 1;
      counted = false;
    }
  }
  return rage;
};

/**
 * Coarse activity histogram across the session window. Marks buckets that
 * contain an error so the sparkline can highlight them.
 */
export const buildSparkline = (
  hits: OtelHit[],
  startMs: number,
  endMs: number,
  buckets = 16
): SessionActivityBucket[] => {
  const slots: SessionActivityBucket[] = Array.from({ length: buckets }, () => ({
    count: 0,
    hasError: false,
  }));
  const span = Math.max(endMs - startMs, 1);
  for (const hit of hits) {
    const source = hit._source ?? {};
    const tsRaw = docTimestamp(source);
    if (!tsRaw) {
      continue;
    }
    const ts = Date.parse(tsRaw);
    if (!Number.isFinite(ts)) {
      continue;
    }
    const idx = Math.min(buckets - 1, Math.max(0, Math.floor(((ts - startMs) / span) * buckets)));
    slots[idx].count += 1;
    if (isErrorHit(source)) {
      slots[idx].hasError = true;
    }
  }
  return slots;
};

/** Sum of active time; gaps longer than idleMs are treated as idle. */
export const computeActiveMs = (timestamps: number[], idleMs = 5000): number => {
  if (timestamps.length < 2) {
    return 0;
  }
  const sorted = [...timestamps].sort((a, b) => a - b);
  let active = 0;
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    active += Math.min(gap, idleMs);
  }
  return active;
};

export type WebVitalName = 'lcp' | 'fcp' | 'cls' | 'inp' | 'ttfb';

/** Read an EDOT Browser web-vital log ({name, value}) when present. */
export const readWebVital = (
  source: Record<string, unknown>
): { name: WebVitalName; value: number } | null => {
  if (docName(source) !== 'browser.web_vital' && source.event_name !== 'browser.web_vital') {
    return null;
  }
  const rawName = attrString(source, 'browser.web_vital.name');
  const value = attrNumber(source, 'browser.web_vital.value');
  if (!rawName || value == null) {
    return null;
  }
  const name = rawName.toLowerCase();
  if (name === 'lcp' || name === 'fcp' || name === 'cls' || name === 'inp' || name === 'ttfb') {
    return { name, value };
  }
  return null;
};

export const actionFromHit = (
  source: Record<string, unknown>,
  sessionStartMs: number
): SessionAction | null => {
  const tsRaw = docTimestamp(source);
  if (!tsRaw) {
    return null;
  }
  const ts = Date.parse(tsRaw);
  const offsetMs = Number.isFinite(ts) ? Math.max(0, ts - sessionStartMs) : 0;
  const name = docName(source);

  if (isErrorHit(source)) {
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'error',
      label: attrString(source, 'exception.type') || attrString(source, 'error.type') || 'Error',
      detail:
        attrString(source, 'exception.message') || attrString(source, 'error.message') || null,
    };
  }

  if (name === 'click') {
    const label = labelFromXPath(attrString(source, 'target_xpath'));
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'click',
      label: label ?? 'Click',
      detail: attrString(source, 'target_xpath'),
    };
  }

  if (name === 'documentLoad' || name === 'documentFetch' || name === 'page.view') {
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'load',
      label: 'Page load',
      detail: pageFromHit(source),
    };
  }

  return null;
};
