/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { EngineEvent, EventVerification } from '../../../common';
import { BUCKET_MS, OPEN_EVENT_STATUSES } from '../../../common';
import { runEvidence } from '../agent/build_case';
import { mapWithConcurrency } from '../concurrency';
import type { TaggedObservation } from '../domain';
import type { IEventWorkingSet } from './event_working_set';
import { transitionEvent } from './lifecycle_step';
import type { IRunRecorder } from './run_recorder';

/** Events closed this recently are re-checked by the verifier. */
const VERIFY_CLOSE_WITHIN_MS = 10 * BUCKET_MS;
/** Bounds the verifier's queries per run; the rest are verified on later runs. */
const MAX_VERIFICATIONS_PER_RUN = 10;
/** An open event whose evidence did not hold is checked again after this long. */
const RECHECK_AFTER_MS = 10 * BUCKET_MS;
const EVIDENCE_CONCURRENCY = 4;

/** Re-runs every member's evidence; the conclusion holds when any of them still shows it. */
export async function checkEvidence({
  dataEsClient,
  event,
  signal,
}: {
  dataEsClient: ElasticsearchClient;
  event: EngineEvent;
  signal?: AbortSignal;
}): Promise<{ found: number; total: number }> {
  const results = await mapWithConcurrency(event.members, EVIDENCE_CONCURRENCY, (member) =>
    runEvidence({ esClient: dataEsClient, query: member.evidence_esql, signal })
  );
  const found = results.filter(
    (result, index) =>
      result.result === 'found' ||
      // For a silence check, no rows means the service sent nothing: that still shows it.
      (event.members[index].unit === 'drop' && result.result === 'empty')
  ).length;
  return { found, total: results.length };
}

/**
 * The Verifier: after an event opens, re-run its evidence to check the conclusion still holds;
 * after the engine closes one, check it stays healthy. When an open event's evidence shows
 * nothing and none of its signals is firing, it tells the state machine (`evidence_gone`): the
 * event starts recovering, and a second miss ten minutes later closes it, so an event whose
 * evidence no longer holds closes on its own. It never picks a status itself.
 */
export async function verifyRecentEvents({
  dataEsClient,
  events,
  latestObservations,
  before,
  processedUpTo,
  feedsStateMachine,
  recorder,
  signal,
}: {
  dataEsClient: ElasticsearchClient;
  events: IEventWorkingSet;
  /** The newest observation of each series in this run. */
  latestObservations: Map<string, TaggedObservation>;
  /** Start of the earliest bucket this run evaluates; events opened since are verified next run. */
  before: number;
  /** End of the last minute this run processed: the data time of a status change it causes. */
  processedUpTo: number;
  /** Off: the Verifier only records, as before it fed the state machine. */
  feedsStateMachine: boolean;
  recorder: IRunRecorder;
  signal: AbortSignal;
}): Promise<void> {
  const beforeIso = new Date(before).toISOString();
  const now = Date.now();
  const isFiring = (event: EngineEvent) =>
    event.members.some(
      (member) => !member.healthy && latestObservations.get(member.fingerprint)?.looks_off
    );
  const candidates = events
    .open()
    .filter(
      (event) =>
        event.opened_at < beforeIso &&
        (!event.verification ||
          (feedsStateMachine &&
            !event.verification.holds &&
            event.verification.trigger !== 'closed' &&
            now - Date.parse(event.verification.at) >= RECHECK_AFTER_MS))
    )
    .slice(0, MAX_VERIFICATIONS_PER_RUN);

  const opened = await Promise.all(
    candidates.map(async (event) => {
      const { found, total } = await checkEvidence({ dataEsClient, event, signal });
      const holds = found > 0;
      const verification: EventVerification = {
        at: new Date(now).toISOString(),
        trigger: event.verification ? 'recheck' : 'opened',
        holds,
        details: holds
          ? `Re-ran ${total} evidence query(ies); the problem is still visible.`
          : `Re-ran ${total} evidence query(ies); none returned rows. The conclusion may not hold.`,
      };
      return {
        event,
        verification,
        evidenceGone: feedsStateMachine && !holds && !isFiring(event),
      };
    })
  );

  const recentlyClosed = events
    .all()
    .filter(
      (event) =>
        !OPEN_EVENT_STATUSES.includes(event.status) &&
        event.close_reason === 'recovered' &&
        !event.verification &&
        event.closed_at !== undefined &&
        Date.parse(event.closed_at) >= before - VERIFY_CLOSE_WITHIN_MS
    );
  const closed = recentlyClosed.slice(0, MAX_VERIFICATIONS_PER_RUN).map((event) => {
    const refiring = event.members.filter(
      (member) => latestObservations.get(member.fingerprint)?.looks_off
    );
    const holds = refiring.length === 0;
    const verification: EventVerification = {
      at: new Date().toISOString(),
      trigger: 'closed',
      holds,
      details: holds
        ? 'After closing, every member stayed healthy.'
        : `After closing, ${refiring
            .map((member) => member.title)
            .join(', ')} looked off again: the close may have been early.`,
    };
    return { event, verification };
  });

  [...opened, ...closed].forEach(({ event, verification }) => {
    events.set({ ...(events.get(event.event_id) ?? event), verification }, 'facts');
    recorder.log({
      step: 'verifier',
      action: verification.holds ? 'holds' : 'does_not_hold',
      event_id: event.event_id,
      strategy: event.origin_strategy,
      message: `Verifier (${verification.trigger}) on "${event.title}": ${verification.details}`,
    });
  });
  opened
    .filter(({ evidenceGone }) => evidenceGone)
    .forEach(({ event }) => {
      const current = events.get(event.event_id) ?? event;
      transitionEvent({
        // Kept on the event: a closed event's verification is reset, an open one keeps its miss.
        event: current,
        input: 'evidence_gone',
        at: new Date(Math.max(processedUpTo, Date.parse(current.updated_at))).toISOString(),
        events,
        recorder,
      });
    });
}
