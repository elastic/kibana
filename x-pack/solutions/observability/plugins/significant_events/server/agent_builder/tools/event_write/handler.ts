/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEvent } from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { TriggerEmitter } from '../../../workflows/triggers/emit';
import {
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  type CompactBulkError,
} from '../bulk_write';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import {
  addsNewDetectionRules,
  extractRuleUuids,
  extractRuleUuidsFromEvents,
  mergeEpisodeContext,
  mergeSignalsLatestPerRule,
  preserveStableNarrative,
} from './episode_context';
import { getCalibratedSeverity, type EventsWriteSource } from './severity_calibration_guard';
import { toRuleEvent } from '../../../lib/significant_events/events/to_rule_event';
import {
  buildWriteCandidates,
  fetchActiveEventsForDedup,
  markDuplicateKeys,
  resolveDedupSkips,
} from './dedup';
import {
  alignResults,
  type BulkResults,
  type DedupCandidate,
  type EventsWriteBulkResult,
  type EventsWriteInput,
  type EventsWriteNoOpResult,
  type EventsWriteResult,
  type WriteCandidate,
} from './types';

const WRITE_CONCURRENCY = 10;

export type { EventsWriteBulkResult, EventsWriteInput, EventsWriteResult } from './types';

/**
 * Returns true when the latest stored version for this event_id has the same severity and status
 * as the candidate and the candidate introduces no new detection rules — indicating this snapshot
 * would produce a pure-churn duplicate.
 * Must not call any esClient or eventClient method.
 */
const shouldSkipAsNoOp = (
  latestEvent: SignificantEvent | undefined,
  candidate: WriteCandidate,
  priorDocs: SignificantEvent[]
): boolean => {
  if (latestEvent === undefined) return false;

  const knownRuleUuids = extractRuleUuidsFromEvents([...priorDocs, latestEvent]);
  const addsRule = addsNewDetectionRules(extractRuleUuids(candidate.input.signals), knownRuleUuids);

  return (
    latestEvent.status === candidate.input.status &&
    latestEvent.severity === candidate.input.severity &&
    !addsRule
  );
};

/** Full history for remaining continuation writes (lineage merge). */
const fetchPriorDocsByEventId = async (
  eventSearchClient: RuleEventsClient,
  candidates: WriteCandidate[]
): Promise<{
  latestByEventId: Map<string, SignificantEvent>;
  priorDocsByEventId: Map<string, SignificantEvent[]>;
}> => {
  const latestByEventId = new Map<string, SignificantEvent>();
  const priorDocsByEventId = new Map<string, SignificantEvent[]>();
  await Promise.all(
    candidates
      .filter((c) => c.input.event_id !== undefined)
      .map(async (c) => {
        const { hits } = await eventSearchClient.findByEventId(c.eventId);
        priorDocsByEventId.set(c.eventId, hits);
        const latest = hits.at(-1);
        if (latest !== undefined) {
          latestByEventId.set(c.eventId, latest);
        }
      })
  );
  return { latestByEventId, priorDocsByEventId };
};

const buildPendingWrite = (
  candidate: WriteCandidate,
  timestamp: string,
  latestByEventId: Map<string, SignificantEvent>,
  priorDocsByEventId: Map<string, SignificantEvent[]>
) => {
  const { event_id: _explicitId, ...rest } = candidate.input;
  const priorDocs = priorDocsByEventId.get(candidate.eventId) ?? [];
  const latestEvent = latestByEventId.get(candidate.eventId);
  const isContinuation = candidate.input.event_id !== undefined;

  const signals = isContinuation
    ? mergeSignalsLatestPerRule(priorDocs, candidate.input.signals ?? [], timestamp)
    : candidate.input.signals ?? [];

  const episodeContext = isContinuation
    ? mergeEpisodeContext(priorDocs, rest, timestamp)
    : {
        sourceIds: rest.source_ids,
        causalFeatures: rest.causal_features ?? [],
        blastRadius: rest.blast_radius ?? [],
      };

  // Discovery assigns the final status directly; persist caller-supplied status for all write modes.
  const status = candidate.input.status;

  // For continuations: if no new rule UUIDs are introduced, freeze title and symptom_hypothesis to
  // prevent identity hijack — the scenario where an unrelated condition's narrative replaces the
  // original event identity while the old rules are still listed in signals (#1082).
  const frozenNarrative = isContinuation
    ? preserveStableNarrative(
        extractRuleUuids(candidate.input.signals),
        latestEvent,
        extractRuleUuidsFromEvents([...priorDocs, latestEvent])
      )
    : undefined;

  return {
    candidate,
    status,
    narrativePreserved: frozenNarrative?.narrativePreserved,
    document: {
      ...rest,
      ...(frozenNarrative
        ? {
            title: frozenNarrative.title,
            ...(frozenNarrative.symptom_hypothesis !== undefined && {
              symptom_hypothesis: frozenNarrative.symptom_hypothesis,
            }),
          }
        : {}),
      '@timestamp': timestamp,
      event_id: candidate.eventId,
      investigations: latestEvent?.investigations,
      signals,
      source_ids: episodeContext.sourceIds,
      causal_features: episodeContext.causalFeatures,
      blast_radius: episodeContext.blastRadius,
      severity: candidate.input.severity,
      status,
    },
  };
};

/** Writes `error ? bulk_error : written` into `results` for each pending write, by index. */
const applyWriteOutcomes = (
  pendingWrites: Array<ReturnType<typeof buildPendingWrite>>,
  errors: Array<CompactBulkError | undefined>,
  results: BulkResults
): void => {
  pendingWrites.forEach(({ candidate, status, narrativePreserved }, responseIndex) => {
    const error = errors[responseIndex];
    if (error) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status,
        written: false,
        reason: 'bulk_error',
        error,
      };
    } else {
      const result: EventsWriteResult = {
        index: candidate.index,
        event_id: candidate.eventId,
        status,
        written: true,
      };
      if (narrativePreserved) {
        result.narrative_preserved = true;
      }
      results[candidate.index] = result;
    }
  });
};

/**
 * Versions a batch of significant events in one request while preserving input order in the
 * returned results.
 *
 * Find-or-create items (no `event_id`):
 *  - Scan all currently-active events for one whose confirmed rules contain the candidate's
 *    confirmed rules and whose sources overlap the candidate sources.
 *  - If the candidate has no confirmed rules, compare all rules instead.
 *  - If found, skip the write and return the existing event_id (existing_active_event).
 *  - Otherwise write a new event with the caller-supplied status.
 *
 * Snapshot-mode items (`event_id` present):
 *  - When `rejectUnknownEventIds` is enabled, reject IDs with no canonical lineage.
 *  - Skip the write (`unchanged_outcome`) when the latest stored version has the same severity and
 *    status, avoiding pure-churn duplicates.
 *  - Otherwise write a new version of the identified event, persisting the caller-supplied status.
 *    Merges signals and topology with prior versions when history is found.
 *    When no new rule UUIDs are introduced, the stored `title` and `symptom_hypothesis` are
 *    preserved (`narrative_preserved: true` on the result) to prevent identity hijack.
 */
export async function eventsWriteBulkHandler({
  eventSearchClient,
  alertEventsClient,
  emitTrigger,
  inputs,
  source,
  rejectUnknownEventIds,
  logger,
}: {
  /** Reads prior versions and active events from `.rule-events`. */
  eventSearchClient: RuleEventsClient;
  /** Writes each new version to `.rule-events`. */
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  inputs: EventsWriteInput[];
  source?: EventsWriteSource;
  /** Discovery-only guard for explicit IDs that have no canonical event history. */
  rejectUnknownEventIds?: boolean;
  logger?: Logger;
}): Promise<EventsWriteBulkResult[]> {
  const timestamp = new Date().toISOString();

  assertValidBulkWriteSize(inputs);

  const candidates = buildWriteCandidates(inputs);
  const results: BulkResults = new Array(inputs.length);
  const validCandidates = markDuplicateKeys(candidates, results);

  const dedupCandidates = validCandidates.filter((c): c is DedupCandidate => c.mode === 'dedup');
  const activeEvents = await fetchActiveEventsForDedup(eventSearchClient, dedupCandidates);
  const toWrite = resolveDedupSkips(validCandidates, activeEvents, results);

  const { latestByEventId, priorDocsByEventId } = await fetchPriorDocsByEventId(
    eventSearchClient,
    toWrite
  );
  const knownCandidates = toWrite.filter((candidate) => {
    if (
      rejectUnknownEventIds &&
      candidate.mode === 'snapshot' &&
      !latestByEventId.has(candidate.eventId)
    ) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        written: false,
        reason: 'unknown_event_id',
        error: {
          type: 'validation_error',
          reason: `event_id ${JSON.stringify(
            candidate.eventId
          )} does not exist. Do not retry this item in the current run or reuse this id. Leave it unprocessed so the next discovery cycle routes it again from fresh search results.`,
          status: 404,
        },
      };
      return false;
    }
    return true;
  });
  const calibrated = knownCandidates.map((candidate) => ({
    ...candidate,
    input: {
      ...candidate.input,
      severity: getCalibratedSeverity({
        source,
        latestEvent: latestByEventId.get(candidate.eventId),
        proposedSeverity: candidate.input.severity,
        proposedStatus: candidate.input.status,
        proposedSignals: candidate.input.signals,
      }),
    },
  }));
  const remaining = calibrated.filter((candidate) => {
    if (
      candidate.mode === 'snapshot' &&
      shouldSkipAsNoOp(
        latestByEventId.get(candidate.eventId),
        candidate,
        priorDocsByEventId.get(candidate.eventId) ?? []
      )
    ) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        written: false,
        skipped: true,
        reason: 'unchanged_outcome',
      };
      return false;
    }
    return true;
  });

  if (remaining.length === 0) {
    return alignResults(results, 'Event bulk results were not aligned');
  }

  const pendingToWrite = remaining.map((candidate) =>
    buildPendingWrite(candidate, timestamp, latestByEventId, priorDocsByEventId)
  );

  // `createAlertEvent` waits for a refresh, so the next discovery read sees the new version.
  const writeLimit = pLimit(WRITE_CONCURRENCY);
  const errors = await Promise.all(
    pendingToWrite.map(({ document }) =>
      writeLimit(async (): Promise<CompactBulkError | undefined> => {
        try {
          await alertEventsClient.createAlertEvent(toRuleEvent(document));
          return undefined;
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          logger?.error(`Failed to write to .rule-events: ${reason}`);
          return { type: 'rule_events_write_error', reason };
        }
      })
    )
  );
  applyWriteOutcomes(pendingToWrite, errors, results);

  // Notify subscribed workflows (fire-and-forget) for successfully written docs only: no prior
  // version -> created; a prior version with a different status (e.g. triage re-open) -> status
  // changed. Emission is best-effort and guarded, so it never affects the returned results.
  pendingToWrite.forEach(({ candidate, document }, responseIndex) => {
    if (errors[responseIndex]) {
      return;
    }
    emitSignificantEventWriteTriggers({
      emitTrigger,
      significantEvent: document,
      priorSignificantEvent: latestByEventId.get(candidate.eventId),
    });
  });

  return alignResults(results, 'Event bulk results were not aligned with every input');
}

/**
 * Single-item adapter for callers that require thrown item errors (e.g. `event_create`).
 * Callers must supply `event_id` (snapshot mode). Find-or-create callers (no `event_id`) will
 * hit `existing_active_event`, which this adapter throws as `createBulkWriteOutcomeUnknownError`.
 */
export async function eventsWriteHandler({
  eventSearchClient,
  input,
  alertEventsClient,
  emitTrigger,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  input: EventsWriteInput;
  alertEventsClient: AlertEventsClientApi;
  emitTrigger?: TriggerEmitter;
  logger?: Logger;
}): Promise<EventsWriteResult | EventsWriteNoOpResult> {
  const [result] = await eventsWriteBulkHandler({
    eventSearchClient,
    alertEventsClient,
    emitTrigger,
    inputs: [input],
    logger,
  });
  if (result === undefined) {
    throw createBulkWriteOutcomeUnknownError('Event bulk write did not return a result');
  }
  if (!result.written) {
    if (result.reason === 'unchanged_outcome') {
      return result;
    }
    if ('skipped' in result) {
      throw createBulkWriteOutcomeUnknownError(
        `Event write skipped (existing active event): existing event_id=${result.existing_event_id}`
      );
    }
    throw createBulkWriteItemError(result.error);
  }
  return result;
}
