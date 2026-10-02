/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { BulkResponseItem } from '@elastic/elasticsearch/lib/api/types';
import {
  type SignificantEvent,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import type { AlertEventsClientApi } from '@kbn/alerting-v2-plugin/server';
import type {
  EventClient,
  SignificantEventsReadClient,
} from '../../../lib/significant_events/events';
import {
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
  extractCreateResults,
  type CompactBulkError,
  toCompactBulkError,
} from '../bulk_write';
import { emitSignificantEventWriteTriggers } from '../../../workflows/triggers/emit_significant_event_triggers';
import {
  addsNewDetectionRules,
  confirmedSignals,
  extractDedupIdentity,
  extractRuleUuids,
  extractRuleUuidsFromEvents,
  makeIdentity,
  mergeEpisodeContext,
  mergeSignalsLatestPerRule,
  preserveStableNarrative,
} from './episode_context';
import { getCalibratedSeverity, type EventsWriteSource } from './severity_calibration_guard';
import { toRuleEvent } from '../../../lib/significant_events/events/to_rule_event';

const DUAL_WRITE_CONCURRENCY = 10;

export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> & {
  event_id?: string;
  conversation_id?: string;
};

export interface EventsWriteResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: true;
  /** Set when the stored title and symptom_hypothesis were preserved because this continuation
   *  introduced no new rule UUIDs — preventing identity hijack by an unrelated condition. */
  narrative_preserved?: true;
}

export interface EventsWriteDuplicateResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'existing_active_event';
  existing_event_id: string;
}

export interface EventsWriteNoOpResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  skipped: true;
  reason: 'unchanged_outcome';
}

export interface EventsWriteFailureResult {
  index: number;
  event_id: string;
  status: SignificantEvent['status'];
  written: false;
  reason: 'bulk_error' | 'duplicate_in_batch' | 'unknown_event_id';
  error: CompactBulkError;
}

interface DedupCandidate {
  mode: 'dedup';
  index: number;
  input: EventsWriteInput;
  eventId: string;
  /** Retained separately so the dedup scan can narrow by rule identity. */
  ruleUuids: string[];
  confirmedOnly: boolean;
}

interface SnapshotCandidate {
  mode: 'snapshot';
  index: number;
  input: EventsWriteInput;
  eventId: string;
}

type WriteCandidate = DedupCandidate | SnapshotCandidate;

export type EventsWriteBulkResult =
  | EventsWriteResult
  | EventsWriteDuplicateResult
  | EventsWriteNoOpResult
  | EventsWriteFailureResult;

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

type BulkResults = Array<EventsWriteBulkResult | undefined>;

/** Fills in every still-`undefined` slot or throws — every candidate must resolve to exactly one result. */
const alignResults = (results: BulkResults, message: string): EventsWriteBulkResult[] => {
  const aligned: EventsWriteBulkResult[] = [];
  for (const result of results) {
    if (result === undefined) {
      throw createBulkWriteOutcomeUnknownError(message);
    }
    aligned.push(result);
  }
  return aligned;
};

const normalizeEventId = (eventId: string | undefined): string | undefined =>
  eventId === '' ? undefined : eventId;

const buildWriteCandidates = (inputs: EventsWriteInput[]): WriteCandidate[] =>
  inputs.map((input, index) => {
    const normalizedEventId = normalizeEventId(input.event_id);
    if (normalizedEventId === undefined) {
      // No event_id → find-or-create: scan active events for identity match before writing.
      const { ruleUuids, confirmedOnly } = extractDedupIdentity(input.signals);
      // Normalize event_id to undefined so fetchLatestByEventId does not attempt a lineage lookup.
      const normalizedInput = { ...input, event_id: undefined };
      return {
        mode: 'dedup',
        index,
        input: normalizedInput,
        eventId: uuidv4(),
        ruleUuids,
        confirmedOnly,
      };
    }
    const normalizedInput = { ...input, event_id: normalizedEventId };
    return {
      mode: 'snapshot',
      index,
      input: normalizedInput,
      eventId: normalizedEventId,
    };
  });

/**
 * Flags candidates that share an in-batch dedup identity (identity kind plus stream+rules
 * exact-set match) or event_id (snapshot mode) as `duplicate_in_batch` errors, keeping the first
 * occurrence. Returns the remainder.
 */
const markDuplicateKeys = (
  candidates: WriteCandidate[],
  results: BulkResults
): WriteCandidate[] => {
  const seenKeys = new Map<string, number>();

  for (const candidate of candidates) {
    const key =
      candidate.mode === 'dedup'
        ? [
            candidate.confirmedOnly ? 'confirmed' : 'all',
            makeIdentity({
              streamNames: candidate.input.stream_names,
              ruleUuids: candidate.ruleUuids,
            }),
          ].join('|')
        : candidate.eventId;
    const firstIndex = seenKeys.get(key);

    if (firstIndex !== undefined) {
      const keyLabel =
        candidate.mode === 'dedup'
          ? `dedup identity ${JSON.stringify(key)}`
          : `event_id ${JSON.stringify(candidate.eventId)}`;

      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status: candidate.input.status,
        written: false,
        reason: 'duplicate_in_batch',
        error: {
          type: 'validation_error',
          reason: `Duplicate ${keyLabel} at items[${firstIndex}] and items[${candidate.index}]`,
          status: 400,
        },
      };
    } else {
      seenKeys.set(key, candidate.index);
    }
  }

  return candidates.filter((c) => results[c.index] === undefined);
};

/** Single scan for dedup candidates: fetch all currently-active events for the batch. */
const fetchActiveEventsForDedup = async (
  eventSearchClient: SignificantEventsReadClient,
  dedupCandidates: DedupCandidate[]
): Promise<SignificantEvent[]> => {
  if (dedupCandidates.length === 0) return [];

  // Narrow by stream/rule only when every candidate carries one, otherwise an AND'd filter
  // could exclude a candidate's genuine duplicate that has no value for that field.
  const allCandidatesHaveStreamNames = dedupCandidates.every(
    (c) => c.input.stream_names.length > 0
  );
  const allCandidatesHaveRuleUuids = dedupCandidates.every((c) => c.ruleUuids.length > 0);
  const { hits } = await eventSearchClient.findLatestActive({
    streamNames: allCandidatesHaveStreamNames
      ? [...new Set(dedupCandidates.flatMap((c) => c.input.stream_names))]
      : undefined,
    ruleUuids: allCandidatesHaveRuleUuids
      ? [...new Set(dedupCandidates.flatMap((c) => c.ruleUuids))]
      : undefined,
  });
  return hits;
};

/**
 * Returns true when the candidate's dedup rule set is entirely contained in the corresponding
 * active-event rule set and at least one stream name is shared — meaning this detection is already
 * tracked.
 *
 * Candidates with confirmed rules compare only confirmed rules on both sides. Candidates without
 * confirmed rules retain all-verdict subset matching. A new identity rule not present in any
 * active event still produces a new event.
 *
 * Empty-rule candidates only match empty-rule events to avoid false-matching any event on stream
 * overlap alone.
 */
const isCoveredByActiveEvent = (
  candidate: DedupCandidate,
  ev: SignificantEvent,
  activeStatuses: readonly string[]
): boolean => {
  if (!activeStatuses.includes(ev.status)) return false;

  const candidateStreamSet = new Set(candidate.input.stream_names);
  const streamsOverlap = (ev.stream_names ?? []).some((s) => candidateStreamSet.has(s));
  if (!streamsOverlap) return false;

  const eventRuleUuids = extractRuleUuids(
    candidate.confirmedOnly ? confirmedSignals(ev.signals) : ev.signals
  );
  if (candidate.ruleUuids.length === 0) return eventRuleUuids.length === 0;

  const eventRuleSet = new Set(eventRuleUuids);
  return candidate.ruleUuids.every((uuid) => eventRuleSet.has(uuid));
};

/**
 * Marks dedup candidates whose identity rules are a subset of an active event's corresponding
 * identity rules (with stream overlap) as `existing_active_event` in `results`. Returns the
 * candidates that still need to be written.
 */
const resolveDedupSkips = (
  validCandidates: WriteCandidate[],
  activeEvents: SignificantEvent[],
  results: BulkResults
): WriteCandidate[] => {
  const activeStatuses = SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS as readonly string[];
  const sortedActiveEvents = activeEvents.toSorted((a, b) => {
    const timestampOrder = b['@timestamp'].localeCompare(a['@timestamp']);
    return timestampOrder !== 0
      ? timestampOrder
      : (b.event_id ?? '').localeCompare(a.event_id ?? '');
  });
  const toWrite: WriteCandidate[] = [];

  for (const candidate of validCandidates) {
    if (candidate.mode === 'dedup') {
      const duplicate = sortedActiveEvents.find((ev) =>
        isCoveredByActiveEvent(candidate, ev, activeStatuses)
      );
      if (duplicate) {
        const existingEventId = duplicate.event_id ?? candidate.eventId;
        results[candidate.index] = {
          index: candidate.index,
          event_id: existingEventId,
          status: duplicate.status,
          written: false,
          skipped: true,
          reason: 'existing_active_event',
          existing_event_id: existingEventId,
        };
        continue;
      }
    }
    toWrite.push(candidate);
  }

  return toWrite;
};

/** Full history for remaining continuation writes (lineage merge). */
const fetchPriorDocsByEventId = async (
  eventSearchClient: SignificantEventsReadClient,
  eventClient: EventClient,
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
        // When flag is OFF, eventSearchClient === eventClient (same shared instance from
        // getSharedEventClient()). The identity check avoids a redundant second ES round-trip
        // by reusing the already-fetched hits as the canonical legacy lineage.
        // Fall back to the canonical write client if the read store is unavailable, so a
        // temporary read-store failure cannot abort a write that would otherwise succeed.
        let readClientIsCanonical = eventSearchClient === eventClient;
        let hits: SignificantEvent[];
        try {
          const result = await eventSearchClient.findByEventId(c.eventId);
          hits = result.hits;
        } catch (err) {
          if (eventSearchClient === eventClient) throw err;
          const result = await eventClient.findByEventId(c.eventId);
          hits = result.hits;
          readClientIsCanonical = true;
        }
        const legacyResult = readClientIsCanonical
          ? null
          : await eventClient.findByEventId(c.eventId);
        const legacyHits = legacyResult ? legacyResult.hits : hits;
        priorDocsByEventId.set(c.eventId, hits);
        // `.rule-events` is dual-written asynchronously and can lag the write store. Use the
        // canonical predecessor for fields copied into the new version (especially
        // investigations), while retaining the read-store history for episode-context merging.
        const latest = legacyHits.at(-1);
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
        streamNames: rest.stream_names,
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
      stream_names: episodeContext.streamNames,
      causal_features: episodeContext.causalFeatures,
      blast_radius: episodeContext.blastRadius,
      severity: candidate.input.severity,
      status,
    },
  };
};

/** Writes `detail.error ? bulk_error : written` into `results` for each pending write, by index. */
const applyBulkResults = (
  pendingWrites: Array<ReturnType<typeof buildPendingWrite>>,
  createResults: BulkResponseItem[],
  results: BulkResults
): void => {
  pendingWrites.forEach(({ candidate, status, narrativePreserved }, responseIndex) => {
    const detail = createResults[responseIndex];
    if (detail.error) {
      results[candidate.index] = {
        index: candidate.index,
        event_id: candidate.eventId,
        status,
        written: false,
        reason: 'bulk_error',
        error: toCompactBulkError(detail),
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
 *    confirmed rules and whose streams overlap the candidate streams.
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
  eventClient,
  eventSearchClient,
  inputs,
  source,
  rejectUnknownEventIds,
  alertEventsClient,
  logger,
}: {
  /** Full-surface EventClient — writes and canonical lineage lookups always go here. */
  eventClient: EventClient;
  /**
   * Flag-aware read surface (`getEventSearchClient()`). When `SIGNIFICANT_EVENTS_USE_RULE_EVENTS_READ`
   * is on, routes reads to `.rule-events`; otherwise returns the same shared `EventClient` instance
   * as `eventClient` (no extra ES round-trip). Defaults to `eventClient` for legacy tests.
   * Production callers must always supply this.
   */
  eventSearchClient?: SignificantEventsReadClient;
  inputs: EventsWriteInput[];
  source?: EventsWriteSource;
  /** Discovery-only guard for explicit IDs that have no canonical event history. */
  rejectUnknownEventIds?: boolean;
  /** Optional — callers must attempt to pass in production; omitted only when client is unavailable or in legacy tests. */
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<EventsWriteBulkResult[]> {
  const timestamp = new Date().toISOString();
  const client = eventSearchClient ?? eventClient;

  assertValidBulkWriteSize(inputs);

  const candidates = buildWriteCandidates(inputs);
  const results: BulkResults = new Array(inputs.length);
  const validCandidates = markDuplicateKeys(candidates, results);

  const dedupCandidates = validCandidates.filter((c): c is DedupCandidate => c.mode === 'dedup');
  // Fall back to the canonical write client if the read store is unavailable, so a temporary
  // .rule-events failure cannot block a canonical write.
  let searchClientActiveEvents: SignificantEvent[];
  let canonicalActiveEvents: SignificantEvent[];
  try {
    if (client !== eventClient) {
      // Flag ON: canonical is the authoritative dedup source. Skip the rule-events scan entirely —
      // its results would be discarded (see `activeEvents` below) and the extra scan adds latency
      // plus failure risk without contributing to the dedup decision.
      canonicalActiveEvents = await fetchActiveEventsForDedup(eventClient, dedupCandidates);
      searchClientActiveEvents = []; // unused in this path
    } else {
      searchClientActiveEvents = await fetchActiveEventsForDedup(client, dedupCandidates);
      // When the flag-aware read client differs from the canonical write client, also scan the
      // canonical store. A write succeeds with `wait_for` refresh on the legacy store, but the
      // dual-write to `.rule-events` is fire-and-forget with no matching refresh guarantee — a scan
      // of `.rule-events` alone can miss a recently written event and produce a permanent duplicate.
      canonicalActiveEvents = [];
    }
  } catch (err) {
    if (client === eventClient) throw err;
    // Canonical scan threw in flag-ON mode — no fallback is possible since canonical is the only
    // dedup source of truth here. Surface the failure.
    throw err;
  }
  // When flag ON, canonical writes first with `wait_for` and is the authoritative source for
  // active state. Merging rule-events results risks including stale-active entries for recently-
  // closed events (fire-and-forget lag), which would suppress valid new writes. Use canonical
  // exclusively for dedup; rule-events is for user-facing reads only.
  const activeEvents = client !== eventClient ? canonicalActiveEvents : searchClientActiveEvents;
  const toWrite = resolveDedupSkips(validCandidates, activeEvents, results);

  const { latestByEventId, priorDocsByEventId } = await fetchPriorDocsByEventId(
    client,
    eventClient,
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
          )} does not exist. Do not resend this id. Resend the item once with the exact event_id of a different open event returned by event_search, or with no event_id to find-or-create.`,
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

  let response;
  try {
    response = await eventClient.bulkCreate(
      pendingToWrite.map(({ document }) => document),
      // `wait_for` lets the immediate discovery `_count` see the newly written event version.
      { throwOnFail: false, refresh: 'wait_for' }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown Elasticsearch transport error';
    throw createBulkWriteOutcomeUnknownError(`Event bulk write outcome is unknown: ${message}`);
  }

  const createResults = extractCreateResults(response, pendingToWrite.length, 'Event');
  applyBulkResults(pendingToWrite, createResults, results);

  // Notify subscribed workflows (fire-and-forget) for successfully written docs only: no prior
  // version -> created; a prior version with a different status (e.g. triage re-open) -> status
  // changed. Emission is best-effort and guarded, so it never affects the returned results.
  const dualWriteLimit = alertEventsClient ? pLimit(DUAL_WRITE_CONCURRENCY) : null;
  const dualWritePromises = pendingToWrite.flatMap(({ candidate, document }, responseIndex) => {
    if (createResults[responseIndex].error) {
      return [];
    }
    emitSignificantEventWriteTriggers({
      eventClient,
      significantEvent: document,
      // Use the canonical predecessor (legacy write store) rather than the read-store view:
      // .rule-events is dual-written fire-and-forget (no refresh guarantee), so it may lag and
      // yield undefined — emitting a spurious eventCreated for an existing event. The read-store
      // client may decode statuses differently, corrupting the status comparison used to decide
      // whether to emit eventStatusChanged.
      priorSignificantEvent: latestByEventId.get(candidate.eventId),
    });
    if (alertEventsClient && dualWriteLimit) {
      return [
        dualWriteLimit(() => alertEventsClient.createAlertEvent(toRuleEvent(document))).catch(
          (err) => {
            logger?.error(
              `Failed to write to .rule-events: ${err instanceof Error ? err.message : err}`
            );
          }
        ),
      ];
    }
    return [];
  });
  await Promise.all(dualWritePromises);

  return alignResults(results, 'Event bulk results were not aligned with every input');
}

/**
 * Single-item adapter for callers that require thrown item errors (e.g. `event_create`).
 * Callers must supply `event_id` (snapshot mode). Find-or-create callers (no `event_id`) will
 * hit `existing_active_event`, which this adapter throws as `createBulkWriteOutcomeUnknownError`.
 */
export async function eventsWriteHandler({
  eventClient,
  input,
  alertEventsClient,
  logger,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
  /** Optional — callers must attempt to pass in production; omitted only when client is unavailable or in legacy tests. */
  alertEventsClient?: AlertEventsClientApi;
  logger?: Logger;
}): Promise<EventsWriteResult | EventsWriteNoOpResult> {
  const [result] = await eventsWriteBulkHandler({
    eventClient,
    inputs: [input],
    alertEventsClient,
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
