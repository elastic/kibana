/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createUxServerRoute } from '../create_ux_server_route';
import {
  RUM_SESSION_SOURCE_INDEX,
  SESSION_ID_FIELDS,
  SESSION_REPLAY_INDEX,
  type PageVisit,
  type RumSessionDetail,
  type SessionAction,
  type SessionWebVitals,
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
import { getRumSearchClient } from '../../lib/rum_search_client';

const EMPTY_VITALS: SessionWebVitals = {
  lcp: null,
  fcp: null,
  cls: null,
  inp: null,
  ttfb: null,
};

const sessionMatchFields = SESSION_ID_FIELDS.flatMap((field) => [field, `resource.${field}`]);

export const getSessionRoute = createUxServerRoute({
  endpoint: 'GET /internal/ux/session_replay/sessions/{sessionId}',
  options: { access: 'internal' },
  security: { authz: { requiredPrivileges: ['apm'] } },
  // A session id uniquely identifies the session, so the detail lookup is not
  // time-scoped (a session outside the caller's selected range must still load).
  params: t.type({
    path: t.type({ sessionId: t.string }),
  }),
  handler: async ({ context, core, params, request }): Promise<RumSessionDetail> => {
    const { sessionId } = params.path;
    const client = await getRumSearchClient({ context, core, request });

    const sessionMatch = {
      bool: {
        should: sessionMatchFields.map((field) => ({ term: { [field]: sessionId } })),
        minimum_should_match: 1,
      },
    };

    const [rumResult, replayResult] = await Promise.all([
      client.search({
        index: RUM_SESSION_SOURCE_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        size: 2000,
        sort: [{ '@timestamp': 'asc' as const }],
        query: { bool: { must: [sessionMatch] } },
        _source: [
          'name',
          'event_name',
          '@timestamp',
          'attributes',
          'resource.attributes',
          'trace',
          'span',
          'trace.id',
          'span.id',
          'trace_id',
          'span_id',
        ],
      }),
      client.count({
        index: SESSION_REPLAY_INDEX,
        ignore_unavailable: true,
        allow_no_indices: true,
        query: { bool: { must: [sessionMatch] } },
      }),
    ]);

    const hits = rumResult.hits.hits as OtelHit[];
    const replayEventCount = replayResult.count ?? 0;

    const timestamps = hits
      .map((hit) => docTimestamp(hit._source ?? {}))
      .filter((ts): ts is string => Boolean(ts))
      .map((ts) => Date.parse(ts))
      .filter((ts) => Number.isFinite(ts));
    const startMs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const endMs = timestamps.length > 0 ? Math.max(...timestamps) : startMs;
    const startTime = new Date(startMs).toISOString();
    const endTime = new Date(endMs).toISOString();

    const clicks: Array<{ xpath: string | null; ts: number }> = [];
    const sessionVitals: SessionWebVitals = { ...EMPTY_VITALS };
    let errorCount = 0;
    let actionCount = 0;

    // Walk hits in order, splitting into page visits on page-label change.
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

      // Web vitals: accumulate at session + current page level.
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

      if (isErrorHit(source)) {
        errorCount += 1;
        if (current) {
          current.errorCount += 1;
        }
      }
      if (name === 'click') {
        actionCount += 1;
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

    // Cap actions per visit to keep payload bounded.
    const boundedVisits = visits.map((visit) => ({
      ...visit,
      actions: capActions(visit.actions),
    }));

    return {
      sessionId,
      startTime,
      endTime,
      durationMs: Math.max(0, endMs - startMs),
      eventCount: hits.length,
      errorCount,
      actionCount,
      rageClickCount: countRageClicks(clicks),
      pageCount: boundedVisits.length,
      user: userFromHits(hits),
      client: clientFromHits(hits),
      webVitals: sessionVitals,
      hasReplay: replayEventCount > 0,
      replayEventCount,
      pageVisits: boundedVisits,
    };
  },
});

const MAX_ACTIONS_PER_VISIT = 100;

/** Keep the first and last actions when a visit is very chatty. */
const capActions = (actions: SessionAction[]): SessionAction[] => {
  if (actions.length <= MAX_ACTIONS_PER_VISIT) {
    return actions;
  }
  const head = actions.slice(0, MAX_ACTIONS_PER_VISIT - 20);
  const tail = actions.slice(-20);
  return [...head, ...tail];
};
