/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import {
  INACTIVE_SERIES_LOOKBACK_HOURS,
  type SignificantEvent,
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS,
} from '@kbn/significant-events-schema';
import type {
  InactiveSeriesHead,
  RuleEventsClient,
} from '../../../lib/significant_events/events/rule_events_client';
import {
  confirmedSignals,
  extractDedupIdentity,
  extractRuleUuids,
  makeIdentity,
} from './episode_context';
import type { BulkResults, DedupCandidate, EventsWriteInput, WriteCandidate } from './types';

/** How far back a closed series is still a candidate for reuse: its latest version must be newer. */
export const DEFAULT_INACTIVE_LOOKBACK_MS = INACTIVE_SERIES_LOOKBACK_HOURS * 60 * 60 * 1000;

/** Closed series read for reuse, with the latest episode of each. */
export interface InactiveSeries {
  events: SignificantEvent[];
  heads: InactiveSeriesHead[];
}
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
 * Flags candidates that share an in-batch dedup identity (identity kind plus source+rules
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
            // Keep their keys separate even when their source and rule sets are identical.
            candidate.confirmedOnly ? 'confirmed' : 'all',
            makeIdentity({
              sourceIds: candidate.input.source_ids,
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

/** Single scan for dedup candidates: fetch all currently-live events for the batch. */
export const fetchLiveEventsForDedup = async (
  eventSearchClient: RuleEventsClient,
  dedupCandidates: DedupCandidate[]
): Promise<SignificantEvent[]> => {
  if (dedupCandidates.length === 0) return [];

  // Narrow by source/rule only when every candidate carries one, otherwise an AND'd filter
  // could exclude a candidate's genuine duplicate that has no value for that field.
  const allCandidatesHaveSourceIds = dedupCandidates.every((c) => c.input.source_ids.length > 0);
  const allCandidatesHaveRuleUuids = dedupCandidates.every((c) => c.ruleUuids.length > 0);
  const { hits } = await eventSearchClient.findLatestLive({
    sourceIds: allCandidatesHaveSourceIds
      ? [...new Set(dedupCandidates.flatMap((c) => c.input.source_ids))]
      : undefined,
    ruleUuids: allCandidatesHaveRuleUuids
      ? [...new Set(dedupCandidates.flatMap((c) => c.ruleUuids))]
      : undefined,
  });
  return hits;
};

/**
 * Reads the closed series that may be reopened by the dedup candidates. Only candidates with both
 * sources and rules can match an identity, so the others are not looked up.
 */
export const fetchInactiveEventsForReuse = async ({
  eventSearchClient,
  dedupCandidates,
  inactiveLookbackMs,
  now = Date.now(),
}: {
  eventSearchClient: RuleEventsClient;
  dedupCandidates: DedupCandidate[];
  /** A closed series whose latest version is older than this many milliseconds is not reused. */
  inactiveLookbackMs: number;
  now?: number;
}): Promise<InactiveSeries> => {
  const identifiable = dedupCandidates.filter(
    (c) => c.input.source_ids.length > 0 && c.ruleUuids.length > 0
  );
  if (identifiable.length === 0) return { events: [], heads: [] };

  const { hits, heads } = await eventSearchClient.findLatestInactiveByIdentity({
    sourceIds: [...new Set(identifiable.flatMap((c) => c.input.source_ids))],
    ruleUuids: [...new Set(identifiable.flatMap((c) => c.ruleUuids))],
    inactiveSince: new Date(now - inactiveLookbackMs).toISOString(),
  });
  return { events: hits, heads };
};

/**
 * Returns true when the candidate's dedup rule set is entirely contained in the corresponding
 * active-event rule set and at least one source id is shared — meaning this detection is already
 * tracked.
 *
 * Candidates with confirmed rules compare only confirmed rules on both sides. Candidates without
 * confirmed rules retain all-verdict subset matching. A new identity rule not present in any
 * active event still produces a new event.
 *
 * Empty-rule candidates only match empty-rule events to avoid false-matching any event on source
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

  const candidateSourceSet = new Set(candidate.input.source_ids);
  const sourcesOverlap = (ev.source_ids ?? []).some((s) => candidateSourceSet.has(s));
  if (!sourcesOverlap) return false;

  const eventRuleUuids = extractRuleUuids(
    candidate.confirmedOnly ? confirmedSignals(ev.signals) : ev.signals
  );
  if (candidate.ruleUuids.length === 0) return eventRuleUuids.length === 0;

  const eventRuleSet = new Set(eventRuleUuids);
  return candidate.ruleUuids.every((uuid) => eventRuleSet.has(uuid));
};

/**
 * Marks dedup candidates whose identity rules are a subset of an active event's corresponding
 * identity rules (with source overlap) as `existing_active_event` in `results`. Returns the
 * candidates that still need to be written.
 */
export const resolveDedupSkips = (
  validCandidates: WriteCandidate[],
  activeEvents: SignificantEvent[],
  results: BulkResults
): WriteCandidate[] => {
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
        isCoveredByActiveEvent(candidate, ev, SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS)
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

const newestFirst = (a: SignificantEvent, b: SignificantEvent): number => {
  const timestampOrder = Date.parse(b['@timestamp']) - Date.parse(a['@timestamp']);
  return timestampOrder !== 0 ? timestampOrder : (b.event_id ?? '').localeCompare(a.event_id ?? '');
};

/** The identity of an event as a dedup candidate would state it: its sources and rule set. */
const identityOfEvent = (ev: SignificantEvent, confirmedOnly: boolean): string =>
  makeIdentity({
    sourceIds: ev.source_ids ?? [],
    ruleUuids: extractRuleUuids(confirmedOnly ? confirmedSignals(ev.signals) : ev.signals),
  });

/**
 * The closed series that exactly match a dedup candidate's identity, newest first. It expects
 * `series` already paired with their latest episode (see `seriesWithHeads`).
 */
const exactInactiveMatches = ({
  candidate,
  series,
}: {
  candidate: WriteCandidate;
  series: Array<{ event: SignificantEvent; head: InactiveSeriesHead }>;
}): Array<{ event: SignificantEvent; head: InactiveSeriesHead }> => {
  if (candidate.mode !== 'dedup' || candidate.ruleUuids.length === 0) return [];

  const identity = makeIdentity({
    sourceIds: candidate.input.source_ids,
    ruleUuids: candidate.ruleUuids,
  });
  return series.filter(
    ({ event }) =>
      event.status === ALERT_EPISODE_STATUS.INACTIVE &&
      identityOfEvent(event, candidate.confirmedOnly) === identity
  );
};

/**
 * Closed series paired with their latest episode, newest first. A series whose latest episode is
 * unknown is omitted: a deactivation cannot be looked up for it, so it is never reopened.
 */
const seriesWithHeads = ({
  events,
  heads,
}: InactiveSeries): Array<{ event: SignificantEvent; head: InactiveSeriesHead }> =>
  events.toSorted(newestFirst).flatMap((event) => {
    const head = heads.find(({ eventId }) => eventId === event.event_id);
    return head === undefined ? [] : [{ event, head }];
  });

/**
 * The latest episodes of the closed series that compete for one candidate: two or more exact
 * matches. Only then does the choice between them need to know which one an operator deactivated,
 * so this limits the deactivation lookup to those series (merged across candidates, by `event_id`).
 */
export const competingInactiveHeads = (
  candidates: WriteCandidate[],
  inactive: InactiveSeries
): InactiveSeriesHead[] => {
  const series = seriesWithHeads(inactive);
  const competing = candidates
    .map((candidate) => exactInactiveMatches({ candidate, series }))
    .filter((matches) => matches.length > 1)
    .flat()
    .map(({ head }) => head);
  return [...new Map(competing.map((head) => [head.eventId, head])).values()];
};

/**
 * Turns each dedup candidate whose identity exactly matches a closed series into a continuation of
 * that series: it keeps the series' `event_id`, so the write opens a new episode under it. A
 * partial overlap never reopens a closed series, and a candidate that no closed series matches stays
 * a new event. When several closed series match, the one an operator deactivated is reopened, so
 * the hold applies to it; otherwise the newest one.
 */
export const reopenMatchingInactiveSeries = ({
  candidates,
  inactive,
  deactivatedGroupHashes = new Set(),
}: {
  candidates: WriteCandidate[];
  inactive: InactiveSeries;
  /** The `group_hash` of the closed series an operator deactivated; it needs to cover only the competing ones. */
  deactivatedGroupHashes?: ReadonlySet<string>;
}): WriteCandidate[] => {
  const series = seriesWithHeads(inactive);

  return candidates.map((candidate): WriteCandidate => {
    const matches = exactInactiveMatches({ candidate, series });
    const chosen =
      matches.find(({ head }) => deactivatedGroupHashes.has(head.groupHash)) ?? matches[0];
    // `event_id` is optional on the type; every paired series has one.
    if (chosen?.event.event_id === undefined) return candidate;

    return {
      mode: 'snapshot',
      index: candidate.index,
      input: { ...candidate.input, event_id: chosen.event.event_id },
      eventId: chosen.event.event_id,
      reopensSeries: { groupHash: chosen.head.groupHash, episodeId: chosen.head.episodeId },
    };
  });
};
