/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EngineEvent, EventEvidenceResponse, EventSeriesResponse } from '../../../common';
import { MINUTE_MS } from '../../../common';
import type { IEngineScope } from '../engine/engine_scope';
import { DetectionEngineError, getErrorMessage } from '../errors';
import { queryRows } from '../esql';

/** Someone is waiting on the page; a slow evidence query should fail rather than hang it. */
const EVIDENCE_TIMEOUT_MS = 20_000;
/** Evidence queries carry their own LIMIT; this only guards a query that does not. */
const MAX_EVIDENCE_ROWS = 100;
/** Minutes of normal shown before the problem started, so the jump is visible. */
const LEAD_MINUTES = 20;
/** Minutes shown after a closed event, to show it stayed healthy. */
const TAIL_MINUTES = 10;
/** The history read keeps at most this many samples per series. */
const MAX_SERIES_MINUTES = 100;

/**
 * Re-runs one signal's evidence query as the person asking, so they read the same rows the agent
 * and the verifier read, with the permissions they have.
 */
export async function readEventEvidence({
  scope,
  event,
  fingerprint,
}: {
  scope: IEngineScope;
  event: EngineEvent;
  fingerprint: string;
}): Promise<EventEvidenceResponse> {
  const member = event.members.find((item) => item.fingerprint === fingerprint);
  if (!member) {
    throw new DetectionEngineError(`Event ${event.event_id} has no signal ${fingerprint}`, 404);
  }
  const started = Date.now();
  try {
    const { columns, rows } = await queryRows({
      esClient: scope.dataEsClient,
      query: member.evidence_esql,
      timeoutMs: EVIDENCE_TIMEOUT_MS,
    });
    return {
      fingerprint,
      query: member.evidence_esql,
      columns,
      rows: rows.slice(0, MAX_EVIDENCE_ROWS),
      took_ms: Date.now() - started,
    };
  } catch (error) {
    // A failed query is something to show next to the signal, not a page error.
    return {
      fingerprint,
      query: member.evidence_esql,
      columns: [],
      rows: [],
      took_ms: Date.now() - started,
      error: getErrorMessage(error),
    };
  }
}

/**
 * Each signal's measured values around the latest time the event was open: some normal before
 * it, the open period, and a little after it closed.
 */
export async function readEventSeries({
  scope,
  event,
}: {
  scope: IEngineScope;
  event: EngineEvent;
}): Promise<EventSeriesResponse> {
  const window = event.open_windows[event.open_windows.length - 1];
  const opened = Date.parse(window?.from ?? event.opened_at);
  const from = opened - LEAD_MINUTES * MINUTE_MS;
  const end = window?.to ? Date.parse(window.to) + TAIL_MINUTES * MINUTE_MS : Date.now();
  // A long event keeps its start in view; the tail is cut instead.
  const to = Math.min(end, Date.now(), from + MAX_SERIES_MINUTES * MINUTE_MS);
  const history = await scope.storage.records.readHistory({
    series: event.members.map((member) => ({ fingerprint: member.fingerprint, exclude: [] })),
    before: to,
    lookbackMs: to - from,
    limit: MAX_SERIES_MINUTES,
  });
  return {
    from: new Date(from).toISOString(),
    to: new Date(to).toISOString(),
    series: event.members.map((member) => ({
      fingerprint: member.fingerprint,
      samples: history.get(member.fingerprint) ?? [],
    })),
  };
}
