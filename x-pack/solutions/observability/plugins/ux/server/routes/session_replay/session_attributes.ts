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
import { makeErrorGroupKey } from '../../../common/rum_app';

export interface OtelHit {
  _id?: string;
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
  const name = source.name ?? source.event_name ?? attrString(source, 'event.name');
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
  toPageLabel(attrString(source, 'url.path.grouped')) ||
  toPageLabel(attrString(source, 'page.url.path')) ||
  toPageLabel(attrString(source, 'page.url')) ||
  toPageLabel(attrString(source, 'url.full')) ||
  toPageLabel(attrString(source, 'http.url'));

/** Dest/list token: strip leading hash/slash so fetch URLs match transform output. */
export const pagePathToken = (raw: string | null): string | null => {
  if (!raw) {
    return null;
  }
  let token = raw.trim();
  while (token.startsWith('#') || token.startsWith('/')) {
    token = token.slice(1);
  }
  return token.length > 0 ? token : null;
};

/** Ordered unique page labels from any event URL, not only documentLoad. */
export const pagePathFromAnyHits = (hits: OtelHit[]): string[] => {
  const pages: string[] = [];
  for (const hit of hits) {
    const token = pagePathToken(pageFromHit(hit._source ?? {}));
    if (!token || isAssetPath(token) || isAssetPath(`/${token}`)) {
      continue;
    }
    if (pages[pages.length - 1] !== token) {
      pages.push(token);
    }
  }
  return pages.slice(0, 12);
};

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

/** Tokens to wildcard-match `attributes.target_xpath` for an activity label. */
export const activitySearchTokens = (label: string): string[] => {
  const trimmed = label.trim();
  const lower = trimmed.toLowerCase();
  if (!trimmed) {
    return [];
  }
  if (lower === 'add to cart') {
    return ['data-add', 'product-grid'];
  }
  if (lower === 'remove item') {
    return ['data-remove', 'cart-list'];
  }
  const id = Object.entries(ACTIVITY_ID_LABELS).find(
    ([, name]) => name.toLowerCase() === lower
  )?.[0];
  if (id) {
    return [`@id="${id}"`, id];
  }
  const tabIndex = NAV_TABS.findIndex((name) => name.toLowerCase() === lower);
  if (tabIndex >= 0) {
    return [`/nav/button[${tabIndex + 1}]`, NAV_TABS[tabIndex]];
  }
  return [trimmed];
};

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

export interface SessionSignalCollections {
  pages: string[];
  activities: string[];
  clicks: Array<{ xpath: string | null; ts: number }>;
  timestamps: number[];
  errorGroups: string[];
}

/** Walk sampled hits into ordered pages, labeled clicks, and timestamps. */
export const collectSessionSignals = (hits: OtelHit[]): SessionSignalCollections => {
  const pages: string[] = [];
  const activities: string[] = [];
  const clicks: Array<{ xpath: string | null; ts: number }> = [];
  const timestamps: number[] = [];
  const errorGroups: string[] = [];

  for (const hit of hits) {
    const source = hit._source ?? {};
    const name = docName(source);
    const page = pageFromHit(source);
    const tsRaw = docTimestamp(source);
    const ts = tsRaw ? Date.parse(tsRaw) : NaN;
    if (Number.isFinite(ts)) {
      timestamps.push(ts);
    }

    const pageIsSignal =
      Boolean(page) &&
      !isAssetPath(page) &&
      (name === 'documentLoad' ||
        name === 'documentFetch' ||
        name === 'page.view' ||
        name === 'click' ||
        name === 'navigation' ||
        name === 'browser.navigation' ||
        name == null);
    if (pageIsSignal && page && pages[pages.length - 1] !== page) {
      pages.push(page);
    }

    if (name === 'click') {
      const xpath = attrString(source, 'target_xpath');
      clicks.push({ xpath, ts: Number.isFinite(ts) ? ts : 0 });
      const label = labelFromXPath(xpath);
      if (label) {
        activities.push(label);
      }
    }

    const group = errorGroupFromHit(source);
    if (group && !errorGroups.includes(group.key)) {
      errorGroups.push(group.key);
    }
  }

  return { pages, activities, clicks, timestamps, errorGroups };
};

export const isErrorHit = (source: Record<string, unknown>): boolean => {
  const name = docName(source);
  if (name === 'exception' || name === 'error') {
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
    countryIso: null,
    breakpoint: null,
    connection: null,
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
    client.countryIso =
      client.countryIso ||
      attrString(source, 'client.geo.country_iso_code') ||
      attrString(source, 'geo.country.iso_code');
    client.breakpoint = client.breakpoint || attrString(source, 'browser.breakpoint');
    client.connection = client.connection || attrString(source, 'network.connection.type');
    if (
      client.browser &&
      client.os &&
      client.country &&
      client.countryIso &&
      client.breakpoint &&
      client.connection
    ) {
      break;
    }
  }
  return client;
};

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']);

const isFollowUpName = (name: string | null): boolean => {
  if (!name) {
    return false;
  }
  return (
    name === 'documentLoad' ||
    name === 'documentFetch' ||
    name === 'page.view' ||
    name === 'browser.navigation' ||
    name === 'navigation' ||
    HTTP_METHODS.has(name)
  );
};

export const exceptionMessageFromSource = (source: Record<string, unknown>): string => {
  const direct =
    attrString(source, 'exception.message') || attrString(source, 'error.message') || '';
  if (direct.trim()) {
    return direct;
  }
  const type = attrString(source, 'exception.type') || attrString(source, 'error.type') || '';
  const stack =
    attrString(source, 'exception.stacktrace') || attrString(source, 'error.stacktrace') || '';
  const first = (stack.split('\n')[0] ?? '').trim();
  if (type && first.startsWith(`${type}:`)) {
    return first.slice(type.length + 1).trim();
  }
  return first;
};

export const errorGroupFromHit = (
  source: Record<string, unknown>
): {
  key: string;
  type: string;
  message: string;
  groupingKey: string | null;
} | null => {
  if (!isErrorHit(source)) {
    return null;
  }
  const type = attrString(source, 'exception.type') || attrString(source, 'error.type') || 'Error';
  const message = exceptionMessageFromSource(source);
  const groupingKey =
    attrString(source, 'error.grouping_key') || attrString(source, 'grouping_key');
  return {
    key: groupingKey || makeErrorGroupKey(type, message),
    type,
    message,
    groupingKey,
  };
};

export const traceIdFromHit = (source: Record<string, unknown>): string | null =>
  attrString(source, 'trace.id') ||
  (typeof source.trace_id === 'string' ? source.trace_id : null) ||
  (typeof source['trace.id'] === 'string' ? (source['trace.id'] as string) : null);

export const spanIdFromHit = (source: Record<string, unknown>): string | null =>
  attrString(source, 'span.id') ||
  (typeof source.span_id === 'string' ? source.span_id : null) ||
  (typeof source['span.id'] === 'string' ? (source['span.id'] as string) : null);

/** Dead = click with no navigation/http within 1s. Error-click = click followed by an exception. */
export const SDK_FRUSTRATION_EVENTS = {
  rage: 'browser.frustration.rage_click',
  dead: 'browser.frustration.dead_click',
  error: 'browser.frustration.error_click',
} as const;

export const countSdkFrustration = (
  hits: OtelHit[]
): { dead: number; errorClicks: number; rage: number } => {
  let rage = 0;
  let dead = 0;
  let errorClicks = 0;
  for (const hit of hits) {
    const name = docName(hit._source ?? {});
    if (name === SDK_FRUSTRATION_EVENTS.rage) {
      rage += 1;
    } else if (name === SDK_FRUSTRATION_EVENTS.dead) {
      dead += 1;
    } else if (name === SDK_FRUSTRATION_EVENTS.error) {
      errorClicks += 1;
    }
  }
  return { rage, dead, errorClicks };
};

export const countDeadAndErrorClicks = (
  hits: OtelHit[],
  clicks: Array<{ xpath: string | null; ts: number }>
): { dead: number; errorClicks: number; rage: number } => {
  const sdk = countSdkFrustration(hits);
  const rage = countRageClicks(clicks);
  const events = hits
    .map((hit) => {
      const source = hit._source ?? {};
      const tsRaw = docTimestamp(source);
      const ts = tsRaw ? Date.parse(tsRaw) : NaN;
      const name = docName(source);
      return {
        ts,
        isClick: name === 'click',
        isError: isErrorHit(source),
        isFollowUp: isFollowUpName(name) || attrString(source, 'http.request.method') != null,
      };
    })
    .filter((event) => Number.isFinite(event.ts))
    .sort((a, b) => a.ts - b.ts);

  let dead = 0;
  let errorClicks = 0;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.isClick) {
      continue;
    }
    let sawFollowUp = false;
    let sawError = false;
    for (let j = i + 1; j < events.length; j++) {
      const next = events[j];
      if (next.ts - event.ts > 1000) {
        break;
      }
      if (next.isError) {
        sawError = true;
      }
      if (next.isFollowUp && !next.isClick) {
        sawFollowUp = true;
      }
    }
    if (sawError) {
      errorClicks += 1;
    } else if (!sawFollowUp) {
      dead += 1;
    }
  }
  return {
    dead: sdk.dead || dead,
    errorClicks: sdk.errorClicks || errorClicks,
    rage: sdk.rage || rage,
  };
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
  const traceId = traceIdFromHit(source);
  const spanId = spanIdFromHit(source);

  if (isErrorHit(source)) {
    const group = errorGroupFromHit(source);
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'error',
      label: group?.type || 'Error',
      detail: group?.message || null,
      traceId,
      spanId,
      errorGroup: group?.key ?? null,
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
      traceId,
      spanId,
    };
  }

  if (name === 'documentLoad' || name === 'documentFetch' || name === 'page.view') {
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'load',
      label: 'Page load',
      detail: pageFromHit(source),
      traceId,
      spanId,
    };
  }

  if (name === 'browser.navigation' || name === 'navigation') {
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'navigation',
      label: 'Navigation',
      detail: pageFromHit(source),
      traceId,
      spanId,
    };
  }

  const vital = readWebVital(source);
  if (vital?.name === 'inp') {
    const target = attrString(source, 'browser.web_vital.inp.target');
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'inp',
      label: target ? `INP · ${target}` : 'INP',
      detail: `${Math.round(vital.value)}ms`,
      traceId,
      spanId,
    };
  }

  if (name === 'longtask' || name === 'long_task') {
    const src =
      attrString(source, 'longtask.script_source') ||
      attrString(source, 'longtask.attribution.container_src');
    const duration = attrNumber(source, 'longtask.duration');
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'longtask',
      label: src ? `Long task · ${src}` : 'Long task',
      detail: duration != null ? `${Math.round(duration)}ms` : null,
      traceId,
      spanId,
    };
  }

  const method =
    attrString(source, 'http.request.method') || (name && HTTP_METHODS.has(name) ? name : null);
  if (method) {
    const status = attrString(source, 'http.response.status_code');
    const url = pageFromHit(source) || urlFromHit(source);
    const gql = attrString(source, 'graphql.operation.name');
    return {
      offsetMs,
      timestamp: tsRaw,
      kind: 'http',
      label: gql ? `GQL ${gql}` : status ? `${method} ${status}` : method,
      detail: url,
      traceId,
      spanId,
      graphqlOperation: gql,
    };
  }

  return null;
};
