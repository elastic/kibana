/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PageVisit,
  RumSessionDetail,
  SessionAction,
  SessionWebVitals,
} from '../../../common/session_replay';
import {
  actionFromHit,
  attrString,
  clientFromHits,
  countRageClicks,
  docName,
  docTimestamp,
  isAssetPath,
  isErrorHit,
  pageFromHit,
  readWebVital,
  urlFromHit,
  userFromHits,
  type OtelHit,
} from './session_attributes';

const EMPTY_VITALS: SessionWebVitals = {
  lcp: null,
  fcp: null,
  cls: null,
  inp: null,
  ttfb: null,
};

const MAX_ACTIONS_PER_VISIT = 100;

/** Hits used to build the page journey. Session duration/counts come from aggregations. */
export const SESSION_DETAIL_HIT_SIZE = 2000;
/** Errors can land after the sampled window; fetch them separately and merge in. */
export const SESSION_DETAIL_ERROR_HIT_SIZE = 100;

export interface SessionSpanStats {
  startMs: number;
  endMs: number;
  eventCount: number;
  errorCount: number;
  actionCount: number;
}

interface MinMaxAgg {
  value?: number | null;
  value_as_string?: string;
}

export interface SessionSpanAggs {
  min_ts?: MinMaxAgg;
  max_ts?: MinMaxAgg;
  error_count?: { doc_count?: number };
  click_count?: { doc_count?: number };
}

const millisFromAgg = (agg?: MinMaxAgg): number | null => {
  if (!agg) {
    return null;
  }
  if (typeof agg.value === 'number' && Number.isFinite(agg.value)) {
    return agg.value;
  }
  if (agg.value_as_string) {
    const parsed = Date.parse(agg.value_as_string);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const timestampsFromHits = (hits: OtelHit[]): number[] =>
  hits
    .map((hit) => docTimestamp(hit._source ?? {}))
    .filter((ts): ts is string => Boolean(ts))
    .map((ts) => Date.parse(ts))
    .filter((ts) => Number.isFinite(ts));

const totalHitsValue = (total: unknown): number | null => {
  if (typeof total === 'number' && Number.isFinite(total)) {
    return total;
  }
  if (total && typeof total === 'object' && 'value' in total) {
    const value = (total as { value?: unknown }).value;
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
};

/** Prefer aggregations over the sampled hit window so list and details share a span. */
export const sessionSpanFromSearch = (
  aggs: SessionSpanAggs | undefined,
  hits: OtelHit[],
  totalHits: unknown
): SessionSpanStats => {
  const timestamps = timestampsFromHits(hits);
  const hitStart = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
  const hitEnd = timestamps.length > 0 ? Math.max(...timestamps) : hitStart;
  const startMs = millisFromAgg(aggs?.min_ts) ?? hitStart;
  const endMs = millisFromAgg(aggs?.max_ts) ?? hitEnd;
  return {
    startMs,
    endMs: Math.max(endMs, startMs),
    eventCount: totalHitsValue(totalHits) ?? hits.length,
    errorCount:
      aggs?.error_count?.doc_count ?? hits.filter((hit) => isErrorHit(hit._source ?? {})).length,
    actionCount:
      aggs?.click_count?.doc_count ??
      hits.filter((hit) => docName(hit._source ?? {}) === 'click').length,
  };
};

export const mergeSessionHits = (sampled: OtelHit[], extra: OtelHit[]): OtelHit[] => {
  if (extra.length === 0) {
    return sampled;
  }
  const seen = new Set(sampled.map((hit) => hit._id).filter((id): id is string => Boolean(id)));
  const merged = [...sampled];
  for (const hit of extra) {
    if (hit._id && seen.has(hit._id)) {
      continue;
    }
    if (hit._id) {
      seen.add(hit._id);
    }
    merged.push(hit);
  }
  return merged.sort((a, b) => {
    const aTs = Date.parse(docTimestamp(a._source ?? {}) ?? '') || 0;
    const bTs = Date.parse(docTimestamp(b._source ?? {}) ?? '') || 0;
    return aTs - bTs;
  });
};

/** Keep the first and last actions when a visit is very chatty. */
const capActions = (actions: SessionAction[]): SessionAction[] => {
  if (actions.length <= MAX_ACTIONS_PER_VISIT) {
    return actions;
  }
  const head = actions.slice(0, MAX_ACTIONS_PER_VISIT - 20);
  const tail = actions.slice(-20);
  return [...head, ...tail];
};

export const buildSessionDetail = ({
  sessionId,
  hits,
  span,
  replayEventCount,
}: {
  sessionId: string;
  hits: OtelHit[];
  span: SessionSpanStats;
  replayEventCount: number;
}): RumSessionDetail => {
  const { startMs, endMs } = span;
  const startTime = new Date(startMs).toISOString();
  const endTime = new Date(endMs).toISOString();

  const clicks: Array<{ xpath: string | null; ts: number }> = [];
  const sessionVitals: SessionWebVitals = { ...EMPTY_VITALS };

  const visits: PageVisit[] = [];
  let current: (PageVisit & { _vitalCls: number }) | null = null;

  const finalize = (visit: (PageVisit & { _vitalCls: number }) | null, closeMs: number) => {
    if (!visit) {
      return;
    }
    visit.endTime = new Date(closeMs).toISOString();
    visit.durationMs = Math.max(0, closeMs - Date.parse(visit.startTime));
    const { _vitalCls, ...rest } = visit;
    visits.push(rest);
  };

  let lastPage: string | null = null;

  for (const hit of hits) {
    const source = hit._source ?? {};
    const tsRaw = docTimestamp(source);
    const ts = tsRaw ? Date.parse(tsRaw) : startMs;
    const name = docName(source);
    const page = pageFromHit(source);

    const vital = readWebVital(source);
    if (vital) {
      if (vital.name === 'cls') {
        sessionVitals.cls = (sessionVitals.cls ?? 0) + vital.value;
      } else if (sessionVitals[vital.name] == null) {
        sessionVitals[vital.name] = vital.value;
      }
    }

    const isRealPage = Boolean(page) && !isAssetPath(page);
    if (isRealPage && page !== lastPage) {
      finalize(current, ts);
      current = {
        index: visits.length,
        path: page!,
        url: urlFromHit(source),
        startTime: tsRaw ?? startTime,
        endTime: tsRaw ?? startTime,
        durationMs: 0,
        actionCount: 0,
        errorCount: 0,
        actions: [],
        webVitals: { ...EMPTY_VITALS },
        _vitalCls: 0,
      };
      lastPage = page;
    }

    if (vital && current) {
      if (vital.name === 'cls') {
        current._vitalCls += vital.value;
        current.webVitals.cls = current._vitalCls;
      } else if (current.webVitals[vital.name] == null) {
        current.webVitals[vital.name] = vital.value;
      }
    }

    if (isErrorHit(source) && current) {
      current.errorCount += 1;
    }
    if (name === 'click') {
      clicks.push({ xpath: attrString(source, 'target_xpath'), ts });
      if (current) {
        current.actionCount += 1;
      }
    }

    const action = actionFromHit(source, startMs);
    if (action && current) {
      current.actions.push(action);
    }
  }

  finalize(current, endMs);

  const boundedVisits = visits.map((visit) => ({
    ...visit,
    actions: capActions(visit.actions),
  }));

  return {
    sessionId,
    startTime,
    endTime,
    durationMs: Math.max(0, endMs - startMs),
    eventCount: span.eventCount,
    errorCount: span.errorCount,
    actionCount: span.actionCount,
    rageClickCount: countRageClicks(clicks),
    pageCount: boundedVisits.length,
    user: userFromHits(hits),
    client: clientFromHits(hits),
    webVitals: sessionVitals,
    hasReplay: replayEventCount > 0,
    replayEventCount,
    pageVisits: boundedVisits,
  };
};
