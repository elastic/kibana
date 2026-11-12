/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  SessionPageLoad,
  SessionPageVisit,
  SessionRequest,
  SessionTimelineEvent,
} from '../../../../common/sessions';

/** What the journey can be filtered to. */
export type ActivityKind = 'request' | 'click' | 'error' | 'web_vital';
export const ACTIVITY_KINDS: readonly ActivityKind[] = ['request', 'click', 'error', 'web_vital'];

export interface ActivityFilters {
  kinds: ReadonlySet<ActivityKind>;
  /** Matched, case-insensitively, against URLs, selectors, names and messages. */
  search: string;
}

/**
 * Rows a page shows before "Show all": the page scrolls as a whole, so a busy page stays compact
 * without a scroll box of its own.
 */
export const ACTIVITY_ROW_LIMIT = 15;

/** Repeated requests are folded into one row from this many in a row, e.g. polling. */
export const REPEATED_REQUESTS_MIN = 4;

export type ActivityRow =
  | { type: 'request'; key: string; startMs: number; endMs: number; request: SessionRequest }
  | {
      type: 'repeated_requests';
      key: string;
      startMs: number;
      endMs: number;
      requests: SessionRequest[];
    }
  | { type: 'event'; key: string; startMs: number; endMs: number; event: SessionTimelineEvent };

export interface LoadMilestone {
  id: 'first_byte' | 'dom_content_loaded' | 'load';
  label: string;
  /** For the axis, where the full label doesn't fit. */
  shortLabel: string;
  offsetMs: number;
}

/** A stretch of the axis, in milliseconds from the origin and in percent of its width. */
export interface AxisSegment {
  startMs: number;
  endMs: number;
  startPercent: number;
  endPercent: number;
  /** An idle stretch, drawn shorter than its duration. */
  compressed: boolean;
}

export interface VisitActivity {
  /** The time the offsets count from: the navigation start of a page load, else the visit's. */
  originMs: number;
  /** The axis, from the origin to the end of the last activity. */
  segments: AxisSegment[];
  rows: ActivityRow[];
  milestones: LoadMilestone[];
}

/** Stretches without any activity longer than this are compressed on the axis. */
export const IDLE_GAP_MS = 1_000;
/** The width of one compressed stretch, and of all of them together, in percent of the axis. */
const COMPRESSED_GAP_PERCENT = 4;
const COMPRESSED_GAPS_MAX_PERCENT = 30;

/**
 * Lays out the axis so that bursts of activity get the width, as a page load and a click 20s later
 * would otherwise each be a sliver: idle stretches longer than `IDLE_GAP_MS` get a short fixed width.
 */
export const layoutAxis = (intervals: Array<[number, number]>): AxisSegment[] => {
  const sorted = [[0, 0] as [number, number], ...intervals]
    .map(([start, end]): [number, number] => [Math.max(0, start), Math.max(0, start, end)])
    .sort((a, b) => a[0] - b[0]);
  const active: Array<[number, number]> = [];
  for (const [start, end] of sorted) {
    const last = active.at(-1);
    if (last && start - last[1] <= IDLE_GAP_MS) {
      last[1] = Math.max(last[1], end);
    } else {
      active.push([start, end]);
    }
  }
  const gaps = active.length - 1;
  const gapPercent =
    gaps > 0 ? Math.min(COMPRESSED_GAP_PERCENT, COMPRESSED_GAPS_MAX_PERCENT / gaps) : 0;
  // Each burst keeps a sliver of width even when it is a single instant.
  const activeMs = active.map(([start, end]) => Math.max(end - start, 1));
  const totalActiveMs = activeMs.reduce((sum, ms) => sum + ms, 0);
  const activePercent = 100 - gaps * gapPercent;

  const segments: AxisSegment[] = [];
  let percent = 0;
  active.forEach(([start, end], index) => {
    const width = (activeMs[index] / totalActiveMs) * activePercent;
    segments.push({
      startMs: start,
      endMs: Math.max(end, start + 1),
      startPercent: percent,
      endPercent: percent + width,
      compressed: false,
    });
    percent += width;
    const next = active[index + 1];
    if (next) {
      segments.push({
        startMs: Math.max(end, start + 1),
        endMs: next[0],
        startPercent: percent,
        endPercent: percent + gapPercent,
        compressed: true,
      });
      percent += gapPercent;
    }
  });
  return segments;
};

/** Where an offset from the origin falls on the axis, in percent of its width. */
export const axisPercent = (segments: AxisSegment[], offsetMs: number): number => {
  const segment = segments.find(({ endMs }) => offsetMs <= endMs) ?? segments.at(-1);
  if (!segment) {
    return 0;
  }
  const { startMs, endMs, startPercent, endPercent } = segment;
  const share = endMs > startMs ? (offsetMs - startMs) / (endMs - startMs) : 0;
  return Math.min(
    100,
    Math.max(0, startPercent + Math.min(1, Math.max(0, share)) * (endPercent - startPercent))
  );
};

const FIRST_BYTE_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.activity.firstByteMilestone',
  { defaultMessage: 'First byte' }
);
const DOM_CONTENT_LOADED_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.activity.domContentLoadedMilestone',
  { defaultMessage: 'DOM content loaded' }
);
const LOAD_LABEL = i18n.translate('xpack.digitalExperience.sessionDetail.activity.loadMilestone', {
  defaultMessage: 'Load',
});
const FIRST_BYTE_SHORT_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.activity.firstByteMilestoneShort',
  { defaultMessage: 'TTFB' }
);
const DOM_CONTENT_LOADED_SHORT_LABEL = i18n.translate(
  'xpack.digitalExperience.sessionDetail.activity.domContentLoadedMilestoneShort',
  { defaultMessage: 'DCL' }
);

/** The URL without its query or fragment, so that e.g. `/api/poll?n=1` and `?n=2` match. */
export const urlWithoutQuery = (url: string): string => url.split(/[?#]/)[0];

const kindOfEvent = ({ kind }: SessionTimelineEvent): ActivityKind | null =>
  kind === 'click' || kind === 'error' || kind === 'web_vital' ? kind : null;

const matchesSearch = (search: string, ...values: Array<string | null>): boolean =>
  search.length === 0 || values.some((value) => value?.toLowerCase().includes(search));

const requestMatches = (request: SessionRequest, { kinds, search }: ActivityFilters): boolean =>
  kinds.has('request') && matchesSearch(search, request.url, request.initiatorType, request.method);

const eventMatches = (event: SessionTimelineEvent, { kinds, search }: ActivityFilters): boolean => {
  const kind = kindOfEvent(event);
  // Page views mark where a visit starts, so they show whatever the filter.
  if (kind === null) {
    return event.kind === 'page_view' && search.length === 0;
  }
  return kinds.has(kind) && matchesSearch(search, event.name, event.detail);
};

const rankOf = ({ type }: ActivityRow): number => (type === 'event' ? 0 : 1);

const sameRun = (a: SessionRequest, b: SessionRequest): boolean =>
  a.initiatorType === b.initiatorType &&
  a.method === b.method &&
  urlWithoutQuery(a.url) === urlWithoutQuery(b.url);

/** Folds runs of the same request, with nothing else between them, into one row. */
const foldRepeatedRequests = (rows: ActivityRow[]): ActivityRow[] => {
  const folded: ActivityRow[] = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (row.type !== 'request') {
      folded.push(row);
      index++;
      continue;
    }
    let end = index + 1;
    while (end < rows.length) {
      const next = rows[end];
      if (next.type !== 'request' || !sameRun(row.request, next.request)) {
        break;
      }
      end++;
    }
    const run = rows.slice(index, end) as Array<Extract<ActivityRow, { type: 'request' }>>;
    if (run.length >= REPEATED_REQUESTS_MIN) {
      folded.push({
        type: 'repeated_requests',
        key: `repeated-${row.key}`,
        startMs: Math.min(...run.map(({ startMs }) => startMs)),
        endMs: Math.max(...run.map(({ endMs }) => endMs)),
        requests: run.map(({ request }) => request),
      });
    } else {
      folded.push(...run);
    }
    index = end;
  }
  return folded;
};

const milestonesOf = (load: SessionPageLoad | null): LoadMilestone[] => {
  if (!load) {
    return [];
  }
  const milestones: LoadMilestone[] = [];
  if (load.responseStartMs !== null) {
    milestones.push({
      id: 'first_byte',
      label: FIRST_BYTE_LABEL,
      shortLabel: FIRST_BYTE_SHORT_LABEL,
      offsetMs: load.responseStartMs,
    });
  }
  if (load.domContentLoadedMs !== null) {
    milestones.push({
      id: 'dom_content_loaded',
      label: DOM_CONTENT_LOADED_LABEL,
      shortLabel: DOM_CONTENT_LOADED_SHORT_LABEL,
      offsetMs: load.domContentLoadedMs,
    });
  }
  if (load.loadMs !== null) {
    milestones.push({
      id: 'load',
      label: LOAD_LABEL,
      shortLabel: LOAD_LABEL,
      offsetMs: load.loadMs,
    });
  }
  return milestones;
};

/**
 * The requests and events of a page visit as rows in time order, on one axis: requests as bars,
 * events as instants, repeated requests folded, and the page load milestones.
 */
export const buildVisitActivity = (
  visit: Pick<SessionPageVisit, 'startTime' | 'load'>,
  events: SessionTimelineEvent[],
  requests: SessionRequest[],
  filters: ActivityFilters
): VisitActivity => {
  const normalized = { ...filters, search: filters.search.trim().toLowerCase() };
  const rows: ActivityRow[] = [
    ...requests
      .filter((request) => requestMatches(request, normalized))
      .map((request, index): ActivityRow => {
        const startMs = Date.parse(request.startTime);
        return {
          type: 'request',
          key: `request-${index}-${request.startTime}`,
          startMs,
          endMs: startMs + request.durationMs,
          request,
        };
      }),
    ...events
      .filter((event) => eventMatches(event, normalized))
      .map((event, index): ActivityRow => {
        const startMs = Date.parse(event.timestamp);
        return {
          type: 'event',
          key: `event-${index}-${event.timestamp}`,
          startMs,
          endMs: startMs,
          event,
        };
      }),
  ]
    .filter(({ startMs }) => Number.isFinite(startMs))
    // At the same instant, an event goes first: a click before the requests it fires.
    .sort((a, b) => a.startMs - b.startMs || rankOf(a) - rankOf(b));

  const milestones = milestonesOf(visit.load);
  const visitStartMs = Date.parse(visit.load?.navigationStart ?? visit.startTime);
  const originMs = Math.min(
    Number.isFinite(visitStartMs) ? visitStartMs : Infinity,
    ...rows.map(({ startMs }) => startMs)
  );
  const origin = Number.isFinite(originMs) ? originMs : 0;
  const placedMilestones = milestones.map((milestone) => ({
    ...milestone,
    offsetMs: visitStartMs + milestone.offsetMs - origin,
  }));

  return {
    originMs: origin,
    segments: layoutAxis([
      ...rows.map(({ startMs, endMs }): [number, number] => [startMs - origin, endMs - origin]),
      ...placedMilestones.map(({ offsetMs }): [number, number] => [offsetMs, offsetMs]),
    ]),
    rows: foldRepeatedRequests(rows),
    milestones: placedMilestones,
  };
};

/** The resource type family, which the waterfall colors by. */
export type RequestFamily =
  | 'document'
  | 'stylesheet'
  | 'script'
  | 'image'
  | 'font'
  | 'media'
  | 'api'
  | 'frame'
  | 'other';

const FAMILIES: Record<string, RequestFamily> = {
  navigation: 'document',
  link: 'stylesheet',
  css: 'stylesheet',
  script: 'script',
  img: 'image',
  image: 'image',
  input: 'image',
  use: 'image',
  video: 'media',
  audio: 'media',
  track: 'media',
  fetch: 'api',
  xmlhttprequest: 'api',
  beacon: 'api',
  ping: 'api',
  iframe: 'frame',
  frame: 'frame',
  embed: 'frame',
  object: 'frame',
};

const FONT_EXTENSION = /\.(woff2?|ttf|otf|eot)$/i;

export const requestFamilyOf = ({ initiatorType, url }: SessionRequest): RequestFamily => {
  // Fonts are requested from stylesheets, so only their URL tells them apart.
  if (FONT_EXTENSION.test(urlWithoutQuery(url))) {
    return 'font';
  }
  return FAMILIES[initiatorType] ?? 'other';
};

/** An offset from the start of a page, precise enough to order what happened within a second. */
export const formatElapsed = (milliseconds: number): string => {
  const ms = Math.max(0, milliseconds);
  if (ms < 1_000) {
    return i18n.translate('xpack.digitalExperience.sessionDetail.elapsed.milliseconds', {
      defaultMessage: '{milliseconds} ms',
      values: { milliseconds: Math.round(ms) },
    });
  }
  if (ms < 60_000) {
    return i18n.translate('xpack.digitalExperience.sessionDetail.elapsed.seconds', {
      defaultMessage: '{seconds} s',
      values: { seconds: (ms / 1_000).toFixed(ms < 10_000 ? 2 : 1) },
    });
  }
  const totalSeconds = Math.floor(ms / 1_000);
  return i18n.translate('xpack.digitalExperience.sessionDetail.elapsed.minutes', {
    defaultMessage: '{minutes}:{seconds}',
    values: {
      minutes: Math.floor(totalSeconds / 60),
      seconds: String(totalSeconds % 60).padStart(2, '0'),
    },
  });
};
