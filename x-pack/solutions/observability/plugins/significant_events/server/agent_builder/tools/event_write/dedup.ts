/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type SignificantEvent,
  SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import {
  confirmedSignals,
  extractDedupIdentity,
  extractRuleUuids,
  makeIdentity,
} from './episode_context';
import type { BulkResults, DedupCandidate, EventsWriteInput, WriteCandidate } from './types';

const normalizeEventId = (eventId: string | undefined): string | undefined =>
  eventId === '' ? undefined : eventId;

export const buildWriteCandidates = (inputs: EventsWriteInput[]): WriteCandidate[] =>
  inputs.map((input, index) => {
    const normalizedEventId = normalizeEventId(input.event_id);
    if (normalizedEventId === undefined) {
      // No event_id → find-or-create: scan active events for identity match before writing.
      const { ruleUuids, confirmedOnly } = extractDedupIdentity(input.signals);
      // Normalize event_id to undefined so fetchLatestByEventId does not attempt a lineage lookup.
      const normalizedInput = { ...input, event_id: undefined };
      return {
        mode: 'dedup' as const,
        index,
        input: normalizedInput,
        eventId: uuidv4(),
        ruleUuids,
        confirmedOnly,
      };
    }
    const normalizedInput = { ...input, event_id: normalizedEventId };
    return {
      mode: 'snapshot' as const,
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
export const markDuplicateKeys = (
  candidates: WriteCandidate[],
  results: BulkResults
): WriteCandidate[] => {
  const seenKeys = new Map<string, number>();

  for (const candidate of candidates) {
    const key =
      candidate.mode === 'dedup'
        ? [
            // Confirmed-only and all-verdict identities use different matching semantics.
            // Keep their keys separate even when their stream and rule sets are identical.
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
export const fetchActiveEventsForDedup = async (
  eventSearchClient: RuleEventsClient,
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
 *
 * Full rule-set coverage is deliberate. A partial overlap can span multiple active events, and
 * selecting one would silently discard the candidate rules owned by the others.
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
export const resolveDedupSkips = (
  validCandidates: WriteCandidate[],
  activeEvents: SignificantEvent[],
  results: BulkResults
): WriteCandidate[] => {
  const activeStatuses = SIGNIFICANT_EVENT_ACTIVE_STATUS_OPTIONS as readonly string[];
  const sortedActiveEvents = activeEvents.toSorted((a, b) => {
    const timestampOrder = Date.parse(b['@timestamp']) - Date.parse(a['@timestamp']);
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
          severity: duplicate.severity,
        };
        continue;
      }
    }
    toWrite.push(candidate);
  }

  return toWrite;
};
