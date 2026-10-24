/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dateMath from '@kbn/datemath';
import type { RumFacetBucket } from './rum_app';

export interface RumClickPoint {
  x: number;
  y: number;
  count: number;
  /** Sample of sessions that clicked this bin — not exhaustive. */
  sessionIds?: string[];
}

export const CLICK_BIN_SESSION_SAMPLE = 8;

export interface RumClickMapSnapshot {
  sessionId: string;
  href: string | null;
  width: number;
  height: number;
  events: unknown[];
}

export interface RumClickMapResponse {
  pagePath: string | null;
  pages: RumFacetBucket[];
  totalClicks: number;
  sampledClicks: number;
  hiddenOffViewport: number;
  clicks: RumClickPoint[];
  snapshot: RumClickMapSnapshot | null;
}

interface ReplayEventLike {
  type?: number;
  timestamp?: number;
  data?: {
    href?: string;
    width?: number;
    height?: number;
    source?: number;
    type?: number;
    x?: number;
    y?: number;
  };
}

const RRWEB_META = 4;
const RRWEB_FULL_SNAPSHOT = 2;

export const pathFromHref = (href: string | null | undefined): string | null => {
  if (!href) {
    return null;
  }
  try {
    const url = new URL(href, 'http://local');
    if (url.hash) {
      const frag = url.hash.replace(/^#/, '');
      if (frag.startsWith('/')) {
        return frag.split('?')[0] ?? frag;
      }
      if (frag.length > 0) {
        return `#${frag}`;
      }
    }
    return url.pathname || '/';
  } catch {
    if (href.startsWith('/') || href.startsWith('#')) {
      return href.split('?')[0] ?? href;
    }
    return href;
  }
};

const pathsMatch = (hrefPath: string | null, pagePath: string): boolean => {
  if (!hrefPath) {
    return false;
  }
  return hrefPath === pagePath || hrefPath.endsWith(pagePath) || pagePath.endsWith(hrefPath);
};

/**
 * Pick Meta + FullSnapshot for a page from a reassembled rrweb event stream.
 * Prefers a Meta whose href matches `pagePath`, else the first Meta.
 */
export const extractPageSnapshot = (
  events: unknown[],
  pagePath?: string
): { events: unknown[]; width: number; height: number; href: string | null } | null => {
  const list = events.filter((event): event is ReplayEventLike => {
    const type = (event as ReplayEventLike | undefined)?.type;
    return typeof type === 'number' && type >= 0 && type <= 7;
  });

  let metaIndex = -1;
  for (let i = 0; i < list.length; i++) {
    const event = list[i];
    if (event.type !== RRWEB_META || !event.data?.href) {
      continue;
    }
    if (metaIndex < 0) {
      metaIndex = i;
    }
    if (pagePath && pathsMatch(pathFromHref(event.data.href), pagePath)) {
      metaIndex = i;
      break;
    }
  }

  if (metaIndex < 0) {
    metaIndex = list.findIndex((event) => event.type === RRWEB_META);
  }
  if (metaIndex < 0) {
    return null;
  }

  const meta = list[metaIndex];
  const snapshotAfter = list.find(
    (event, index) => index >= metaIndex && event.type === RRWEB_FULL_SNAPSHOT
  );
  const snapshot =
    snapshotAfter ?? [...list].reverse().find((event) => event.type === RRWEB_FULL_SNAPSHOT);

  if (!meta || !snapshot) {
    return null;
  }

  const width =
    typeof meta.data?.width === 'number' && meta.data.width > 0 ? meta.data.width : 1280;
  const height =
    typeof meta.data?.height === 'number' && meta.data.height > 0 ? meta.data.height : 720;

  return {
    events: [meta, snapshot],
    width,
    height,
    href: meta.data?.href ?? null,
  };
};

const RRWEB_INCREMENTAL = 3;
const RRWEB_MOUSE_INTERACTION = 2;
const RRWEB_MOUSE_CLICK = 2;

/** Click positions from rrweb MouseInteraction events, scoped to `pagePath` when set. */
export const extractReplayClicks = (
  events: unknown[],
  pagePath?: string
): Array<{ x: number; y: number }> => {
  const clicks: Array<{ x: number; y: number }> = [];
  let onPage = !pagePath;
  for (const raw of events) {
    const event = raw as ReplayEventLike;
    if (event.type === RRWEB_META && event.data?.href) {
      onPage = !pagePath || pathsMatch(pathFromHref(event.data.href), pagePath);
      continue;
    }
    if (!onPage) {
      continue;
    }
    if (
      event.type === RRWEB_INCREMENTAL &&
      event.data?.source === RRWEB_MOUSE_INTERACTION &&
      event.data?.type === RRWEB_MOUSE_CLICK &&
      typeof event.data.x === 'number' &&
      typeof event.data.y === 'number'
    ) {
      clicks.push({ x: event.data.x, y: event.data.y });
    }
  }
  return clicks;
};

const pushBinSessionId = (bin: RumClickPoint, sessionId?: string | null): void => {
  if (!sessionId) {
    return;
  }
  const ids = bin.sessionIds ?? [];
  if (ids.length >= CLICK_BIN_SESSION_SAMPLE || ids.includes(sessionId)) {
    return;
  }
  bin.sessionIds = ids;
  ids.push(sessionId);
};

export const binClicks = (
  points: Array<{ x: number; y: number; sessionId?: string | null }>,
  cell = 12,
  max = 800
): RumClickPoint[] => {
  const bins = new Map<string, RumClickPoint>();
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      continue;
    }
    const x = Math.round(point.x / cell) * cell;
    const y = Math.round(point.y / cell) * cell;
    const key = `${x}:${y}`;
    const current = bins.get(key);
    if (current) {
      current.count += 1;
      pushBinSessionId(current, point.sessionId);
    } else {
      const created: RumClickPoint = { x, y, count: 1 };
      pushBinSessionId(created, point.sessionId);
      bins.set(key, created);
    }
  }
  return [...bins.values()].sort((a, b) => b.count - a.count).slice(0, max);
};

/** Keep clicks whose viewport width is within `slack` of the snapshot width. */
export const inViewportBand = (
  viewportWidth: number | null,
  snapshotWidth: number,
  slack = 0.15
): boolean => {
  if (viewportWidth == null || snapshotWidth <= 0) {
    return true;
  }
  return Math.abs(viewportWidth - snapshotWidth) / snapshotWidth <= slack;
};

/** Skip autoload when the selected range is longer than this. */
export const CLICK_MAP_AUTOLOAD_MAX_MS = 30 * 24 * 60 * 60 * 1000;

const parseRangeBound = (value?: string): number | null => {
  if (!value) {
    return null;
  }
  const ms = Date.parse(value);
  if (Number.isFinite(ms)) {
    return ms;
  }
  if (!/now/i.test(value)) {
    return null;
  }
  const parsed = dateMath.parse(value);
  if (!parsed?.isValid()) {
    return null;
  }
  return parsed.valueOf();
};

export const isClickMapLongRange = (start?: string, end?: string): boolean => {
  const from = parseRangeBound(start);
  const to = parseRangeBound(end);
  if (from == null || to == null) {
    return false;
  }
  return to - from > CLICK_MAP_AUTOLOAD_MAX_MS;
};

export const isOnSnapshotViewport = (
  point: { x: number; y: number },
  width: number,
  height: number,
  slack = 0.1
): boolean => {
  if (point.x < -width * slack || point.y < -height * slack) {
    return false;
  }
  return point.x <= width * (1 + slack) && point.y <= height * (1 + slack);
};
