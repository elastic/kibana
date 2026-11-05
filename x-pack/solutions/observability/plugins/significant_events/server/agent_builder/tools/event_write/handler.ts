/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import {
  operatorFallbackAssessmentNote,
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import {
  assertValidBulkWriteSize,
  createBulkWriteItemError,
  createBulkWriteOutcomeUnknownError,
} from '../bulk_write';
import type { CompactBulkError } from '../bulk_write';
import { assessMembers } from '../../../lib/significant_events/events/event_members';
import {
  decideLifecycle,
  StatusChange,
} from '../../../lib/significant_events/events/lifecycle/lifecycle_controller';
import { mergeSignalsLatestPerRule } from './episode_context';
import type { EventsWriteSource } from './severity_lock';
import {
  buildWriteCandidates,
  DEFAULT_INACTIVE_LOOKBACK_MS,
  fetchInactiveEventsForReuse,
  fetchLiveEventsForDedup,
  markDuplicateKeys,
  competingInactiveHeads,
  reopenMatchingInactiveSeries,
  resolveDedupSkips,
} from './dedup';
import {
  applyWriteOutcomes,
  buildPendingWrite,
  computeEventFacts,
  episodeHistory,
  loadHistory,
  shouldSkipAsNoOp,
} from './event_facts';
import {
  alignResults,
  type BulkResults,
  type ClosedSeries,
  type DedupCandidate,
  type EventsWriteBulkResult,
  type EventsWriteInput,
  type EventsWriteNoOpResult,
  type EventsWriteResult,
  type LoadedCandidate,
  type ResolvedWriteCandidate,
} from './types';

export type { EventsWriteBulkResult, EventsWriteInput, EventsWriteResult } from './types';

const WRITE_CONCURRENCY = 10;
const MAX_HELD_NOTE_LENGTH = 1000;

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
  inputs,
  source,
  rejectUnknownEventIds,
  inactiveLookbackMs = DEFAULT_INACTIVE_LOOKBACK_MS,
  logger,
}: {
  /** Reads prior versions and live events from `.rule-events`, and writes each new version. */
  eventSearchClient: RuleEventsClient;
  inputs: EventsWriteInput[];
  source?: EventsWriteSource;
  /** Discovery-only guard for explicit IDs that have no canonical event history. */
  rejectUnknownEventIds?: boolean;
  /** How long a closed series stays reusable by a batch it covers (default 48 h). */
  inactiveLookbackMs?: number;
  logger?: Logger;
}): Promise<EventsWriteBulkResult[]> {
  const timestamp = new Date().toISOString();

  assertValidBulkWriteSize(inputs);

  const results: BulkResults = new Array(inputs.length);
  const candidates = markDuplicateKeys(buildWriteCandidates(inputs), results);
  const dedupCandidates = candidates.filter((c): c is DedupCandidate => c.mode === 'dedup');

  const liveEvents = await fetchLiveEventsForDedup(eventSearchClient, dedupCandidates);
  const unskipped = resolveDedupSkips(candidates, liveEvents, results);
  const inactiveEvents = await fetchInactiveEventsForReuse({
    eventSearchClient,
    dedupCandidates: unskipped.filter((c): c is DedupCandidate => c.mode === 'dedup'),
    inactiveLookbackMs,
  });
  const competing = competingInactiveHeads(unskipped, inactiveEvents);
  // Which closed series an operator deactivated only matters when several compete for one batch;
  // otherwise the single match wins and the hold stage below does its own lookup.
  const deactivatedGroupHashes =
    competing.length === 0
      ? new Set<string>()
      : new Set(
          [
            ...(await eventSearchClient.findOperatorDeactivations({ heads: competing }))
              .deactivations,
          ].flatMap(([groupHash, { reason }]) => (reason === '' ? [] : [groupHash]))
        );
  const toWrite = markDuplicateKeys(
    reopenMatchingInactiveSeries({
      candidates: unskipped,
      inactive: inactiveEvents,
      deactivatedGroupHashes,
    }),
    results
  );

  const eventHistory = await loadHistory({ eventSearchClient, candidates: toWrite });
  const known = keepKnownEvents({ candidates: eventHistory, enabled: rejectUnknownEventIds });
  const decided = decideStatuses({ candidates: known.kept, timestamp });
  const held = await holdDeactivatedReopens({
    candidates: decided.kept,
    eventSearchClient,
    logger,
  });

  // Facts (merged signals/topology, proposed-then-locked severity) are derived once per candidate,
  // so the no-op check and the final document agree on the same severity.
  const eventsFacts = held.kept.map((candidate) =>
    computeEventFacts({ candidate, timestamp, source })
  );
  const changed = keepChanged({ facts: eventsFacts });

  [known, decided, held, changed].forEach(({ skipped }) =>
    skipped.forEach((result) => {
      results[result.index] = result;
    })
  );
  if (changed.kept.length === 0) {
    return alignResults(results, 'Event bulk results were not aligned');
  }

  const pendingWrites = changed.kept.map((fact) => buildPendingWrite({ facts: fact, timestamp }));
  const errors = await writeVersions({ eventSearchClient, pendingWrites, logger });
  applyWriteOutcomes({ pendingWrites, errors, results });

  return alignResults(results, 'Event bulk results were not aligned with every input');
}

/** The items a stage lets through, and the results of the ones it set aside. */
interface Stage<T> {
  kept: T[];
  skipped: EventsWriteBulkResult[];
}

/** Keeps items whose event exists; with the guard on, an explicit unknown id is set aside as failed. */
const keepKnownEvents = ({
  candidates,
  enabled,
}: {
  candidates: LoadedCandidate[];
  enabled: boolean | undefined;
}): Stage<LoadedCandidate> => {
  const stage: Stage<LoadedCandidate> = { kept: [], skipped: [] };
  candidates.forEach((candidate) => {
    if (!enabled || candidate.mode !== 'snapshot' || candidate.latest !== undefined) {
      stage.kept.push(candidate);
      return;
    }
    stage.skipped.push({
      index: candidate.index,
      event_id: candidate.eventId,
      written: false,
      reason: 'unknown_event_id',
      error: {
        type: 'validation_error',
        reason: `event_id ${JSON.stringify(
          candidate.eventId
        )} does not exist. Do not retry this item in the current run or reuse this id. Leave it unprocessed so the next discovery cycle routes it again from fresh search results.`,
        status: 404,
      },
    });
  });
  return stage;
};

/**
 * Keeps the items that have a status to write. An item states one only when its caller owns the
 * decision (`event_create`); otherwise the lifecycle decides from the members' verdicts once this
 * write is merged. When it has nothing to write, a closed event is set aside as unchanged.
 */
const decideStatuses = ({
  candidates,
  timestamp,
}: {
  candidates: LoadedCandidate[];
  timestamp: string;
}): Stage<ResolvedWriteCandidate> => {
  const stage: Stage<ResolvedWriteCandidate> = { kept: [], skipped: [] };
  candidates.forEach((candidate) => {
    if (candidate.input.status !== undefined) {
      stage.kept.push({ ...candidate, status: candidate.input.status });
      return;
    }

    const { latest, priorDocs, input } = candidate;
    // A closed series is judged on what this write submits: only an incoming breach reopens it,
    // never a stale confirmation from its closed episode.
    const isLive =
      latest !== undefined &&
      SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS.some((status) => status === latest.status);
    const signals =
      input.event_id === undefined || !isLive
        ? input.signals ?? []
        : mergeSignalsLatestPerRule(episodeHistory(priorDocs), input.signals ?? [], timestamp);
    const outcome = assessMembers(signals);
    const decision = decideLifecycle({
      state: { status: latest?.status },
      change: StatusChange.assessed(outcome),
    });
    // A continuation names an event that exists. Only a breach may open one under an id it names;
    // a healthy or unjudged item for an unknown id is set aside, never created.
    const continuesUnknownEvent =
      latest === undefined && input.event_id !== undefined && outcome !== 'breached';
    if (decision.write && !continuesUnknownEvent) {
      stage.kept.push({ ...candidate, status: decision.status });
      return;
    }
    if (latest === undefined && input.event_id !== undefined) {
      stage.skipped.push({
        index: candidate.index,
        event_id: candidate.eventId,
        written: false,
        reason: 'unknown_event_id',
        error: {
          type: 'validation_error',
          reason: `event_id ${JSON.stringify(
            candidate.eventId
          )} does not exist, so there is no event to continue. Do not retry this item in the current run.`,
          status: 404,
        },
      });
      return;
    }
    // Nothing was written: a new event is not born from healthy evidence, and an existing one
    // already says what this write would.
    stage.skipped.push({
      index: candidate.index,
      event_id: candidate.eventId,
      ...(latest ? { status: latest.status } : {}),
      written: false,
      skipped: true,
      reason: 'unchanged_outcome',
    });
  });
  return stage;
};

type ReopeningCandidate = ResolvedWriteCandidate & {
  mode: 'snapshot';
  reopensSeries: ClosedSeries;
};

/** A write that would reopen a closed series that the server matched by identity. */
const isReopeningCandidate = (candidate: ResolvedWriteCandidate): candidate is ReopeningCandidate =>
  candidate.mode === 'snapshot' &&
  candidate.reopensSeries !== undefined &&
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS.some((status) => status === candidate.status);

/**
 * Sets aside the writes that would reopen a closed series, so the agent can read why it was closed
 * before the series reopens. The reason is the one recorded with an Alerting v2 `deactivate` action
 * when there is one; a deactivate without a reason is not held, because that close only copies the
 * agent's last note. With no such action, the note on the closing version is read, but only when
 * the deactivation lookup succeeded. A write that carries `reopen_deactivated` has read it and goes
 * through, and so does one with no note to read (blank or the standard no-reason note). Only a
 * new-event batch that a closed series covers can be held: an item that names a closed event itself
 * has no series head to look up.
 */
const holdDeactivatedReopens = async ({
  candidates,
  eventSearchClient,
  logger,
}: {
  candidates: ResolvedWriteCandidate[];
  eventSearchClient: RuleEventsClient;
  logger?: Logger;
}): Promise<Stage<ResolvedWriteCandidate>> => {
  const stage: Stage<ResolvedWriteCandidate> = { kept: [], skipped: [] };
  const reopening = candidates.filter(isReopeningCandidate);
  if (reopening.length === 0) {
    stage.kept.push(...candidates);
    return stage;
  }

  // Looked up even for an item that carries `reopen_deactivated`: the flag cannot be proven to
  // follow a hold, so a reopen it lets through is logged.
  const { deactivations, failed: lookupFailed } = await eventSearchClient.findOperatorDeactivations(
    {
      heads: reopening.map(({ reopensSeries: { groupHash, episodeId } }) => ({
        groupHash,
        episodeId,
      })),
    }
  );
  candidates.forEach((candidate) => {
    if (!isReopeningCandidate(candidate)) {
      stage.kept.push(candidate);
      return;
    }
    const { groupHash, closedAt, closingNote } = candidate.reopensSeries;
    const action = deactivations.get(groupHash);
    // A user deactivate decides alone: its reason is the closer's note, and none means nothing to
    // read, since the closing version only copies the agent's last note. With no user deactivate
    // and a completed lookup, the closing version's note is the operator's, from the update route.
    // A failed lookup proves nothing, so it holds nothing.
    const fullNote = (action ? action.reason : lookupFailed ? '' : closingNote ?? '').trim();
    const note = fullNote.slice(0, MAX_HELD_NOTE_LENGTH);
    const truncated = fullNote.length > MAX_HELD_NOTE_LENGTH;
    // A close that says nothing gives the agent nothing to read.
    if (note === '' || note === operatorFallbackAssessmentNote('inactive')) {
      stage.kept.push(candidate);
      return;
    }
    const identity = `event_id=${candidate.eventId} group_hash=${groupHash}`;
    if (candidate.input.reopen_deactivated === true) {
      logger?.info(`reopened_after_deactivation ${identity}`);
      stage.kept.push(candidate);
      return;
    }
    logger?.info(`held_by_deactivation ${identity}`);
    stage.skipped.push({
      index: candidate.index,
      event_id: candidate.eventId,
      status: 'inactive',
      written: false,
      skipped: true,
      reason: 'held_by_deactivation',
      existing_event_id: candidate.eventId,
      assessment_note: note,
      ...(truncated ? { assessment_note_truncated: true as const } : {}),
      deactivated_at: action?.deactivatedAt ?? closedAt,
    });
  });
  return stage;
};

/** Keeps the continuations that would change something; the rest are set aside as unchanged. */
const keepChanged = ({
  facts,
}: {
  facts: Array<ReturnType<typeof computeEventFacts>>;
}): Stage<ReturnType<typeof computeEventFacts>> => {
  const stage: Stage<ReturnType<typeof computeEventFacts>> = { kept: [], skipped: [] };
  facts.forEach((fact) => {
    const { candidate } = fact;
    if (
      candidate.mode !== 'snapshot' ||
      !shouldSkipAsNoOp({ candidate, severity: fact.severity })
    ) {
      stage.kept.push(fact);
      return;
    }
    stage.skipped.push({
      index: candidate.index,
      event_id: candidate.eventId,
      status: candidate.status,
      written: false,
      skipped: true,
      reason: 'unchanged_outcome',
      severity: candidate.latest?.severity,
    });
  });
  return stage;
};

/** Writes each document (create for a new event, guarded update otherwise); one error slot per write. */
const writeVersions = ({
  eventSearchClient,
  pendingWrites,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  pendingWrites: Array<ReturnType<typeof buildPendingWrite>>;
  logger?: Logger;
}): Promise<Array<CompactBulkError | undefined>> => {
  const writeLimit = pLimit(WRITE_CONCURRENCY);
  return Promise.all(
    pendingWrites.map(({ candidate, document }) =>
      writeLimit(async (): Promise<CompactBulkError | undefined> => {
        try {
          if (candidate.latest === undefined) {
            await eventSearchClient.createEvent({ event: document });
            return undefined;
          }
          const written = await eventSearchClient.updateEvent({
            event: document,
            prior: candidate.latest,
          });
          return written.updated
            ? undefined
            : {
                type: 'superseded_write',
                reason: `event_id ${JSON.stringify(
                  candidate.eventId
                )} changed after it was read, so this write was dropped. Do not retry it in the current run; the next discovery cycle routes it again.`,
              };
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          logger?.error(`Failed to write to .rule-events: ${reason}`);
          return { type: 'rule_events_write_error', reason };
        }
      })
    )
  );
};

/**
 * Single-item adapter for callers that require thrown item errors (e.g. `event_create`).
 * Callers must supply `event_id` (snapshot mode). Find-or-create callers (no `event_id`) will
 * hit `existing_active_event`, which this adapter throws as `createBulkWriteOutcomeUnknownError`.
 */
export async function eventsWriteHandler({
  eventSearchClient,
  input,
  logger,
}: {
  eventSearchClient: RuleEventsClient;
  input: EventsWriteInput;
  logger?: Logger;
}): Promise<EventsWriteResult | EventsWriteNoOpResult> {
  const [result] = await eventsWriteBulkHandler({
    eventSearchClient,
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
