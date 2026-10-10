/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SignificantEvent } from '@kbn/significant-events-schema';
import type { RuleEventsClient } from '../../../lib/significant_events/events/rule_events_client';
import type { CompactBulkError } from '../bulk_write';
import {
  addsNewDetectionRules,
  extractRuleUuids,
  extractRuleUuidsFromEvents,
  mergeEpisodeContext,
  mergeSignalsLatestPerRule,
  preserveStableNarrative,
} from './episode_context';
import { lockSeverityForCompletedInvestigation, type EventsWriteSource } from './severity_lock';
import type { BulkResults, EventsWriteInput, EventsWriteResult, WriteCandidate } from './types';

interface EventFacts
  extends Pick<SignificantEvent, 'status' | 'severity' | 'signals' | 'confidence'> {
  candidate: WriteCandidate;
  rest: Omit<EventsWriteInput, 'event_id'>;
  latestEvent: SignificantEvent | undefined;
  episodeContext: ReturnType<typeof mergeEpisodeContext>;
  frozenNarrative: ReturnType<typeof preserveStableNarrative>;
}

/**
 * Returns true when the latest stored version for this event_id has the same severity and status
 * as the candidate and the candidate introduces no new detection rules — indicating this snapshot
 * would produce a pure-churn duplicate. `severity` is the tier this write would store, after the
 * investigation lock.
 */
export const shouldSkipAsNoOp = ({
  latestEvent,
  candidate,
  priorDocs,
  severity,
}: {
  latestEvent: SignificantEvent | undefined;
  candidate: WriteCandidate;
  priorDocs: SignificantEvent[];
  severity: Severity;
}): boolean => {
  if (latestEvent === undefined) return false;

  const knownRuleUuids = extractRuleUuidsFromEvents([...priorDocs, latestEvent]);
  const addsRule = addsNewDetectionRules(extractRuleUuids(candidate.input.signals), knownRuleUuids);

  return (
    latestEvent.status === candidate.input.status && latestEvent.severity === severity && !addsRule
  );
};

/**
 * The agent decides the tier under the `severity` field contract; the writer stores it. An inactive
 * event is `low`, and a signal-less write (chat create) keeps its explicit severity, or `low` when
 * it gave none.
 */
const decideSeverity = ({
  proposed,
  status,
  signals,
}: {
  proposed: Severity | undefined;
  status: SignificantEvent['status'];
  signals: SignificantEvent['signals'];
}): Severity => {
  if (status === 'inactive') {
    return 'low';
  }
  if ((signals ?? []).length === 0) {
    return proposed ?? 'low';
  }
  if (proposed === undefined) {
    throw new Error('events_write: an event with signals needs a proposed severity.');
  }
  return proposed;
};

/** Full history for remaining continuation writes (lineage merge). */
export const fetchPriorDocsByEventId = async ({
  eventSearchClient,
  candidates,
}: {
  eventSearchClient: RuleEventsClient;
  candidates: WriteCandidate[];
}): Promise<{
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

/**
 * Merges this candidate's signals and topology with its prior versions (continuation only), then
 * takes the agent's proposed severity, floors an inactive event to low and applies the
 * investigation lock — the facts shared by the no-op check and the final document, derived once per
 * candidate so the two cannot disagree.
 */
export const computeEventFacts = ({
  candidate,
  timestamp,
  latestByEventId,
  priorDocsByEventId,
  source,
}: {
  candidate: WriteCandidate;
  timestamp: string;
  latestByEventId: Map<string, SignificantEvent>;
  priorDocsByEventId: Map<string, SignificantEvent[]>;
  source: EventsWriteSource | undefined;
}): EventFacts => {
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
        confidence: rest.confidence ?? 0,
      };

  // Discovery assigns the final status directly; persist caller-supplied status for all write modes.
  const status = candidate.input.status;

  const severity = lockSeverityForCompletedInvestigation({
    source,
    latestEvent,
    proposedSeverity: decideSeverity({ proposed: candidate.input.severity, status, signals }),
    proposedStatus: status,
    proposedSignals: candidate.input.signals,
  });

  // For continuations: if no new rule UUIDs are introduced, freeze title and symptom_hypothesis to prevent identity hijack
  const frozenNarrative = isContinuation
    ? preserveStableNarrative(
        extractRuleUuids(candidate.input.signals),
        latestEvent,
        extractRuleUuidsFromEvents([...priorDocs, latestEvent])
      )
    : undefined;

  return {
    candidate,
    rest,
    latestEvent,
    signals,
    episodeContext,
    status,
    severity,
    frozenNarrative,
    confidence: episodeContext.confidence,
  };
};

/** Assembles the final document from facts computeEventFacts already derived for this candidate. */
export const buildPendingWrite = ({
  facts,
  timestamp,
}: {
  facts: EventFacts;
  timestamp: string;
}) => {
  const {
    candidate,
    rest,
    latestEvent,
    signals,
    episodeContext,
    status,
    severity,
    frozenNarrative,
    confidence,
  } = facts;

  return {
    candidate,
    status,
    narrativePreserved: frozenNarrative?.narrativePreserved,
    severity,
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
      severity,
      status,
      confidence,
    },
  };
};

/** Writes `error ? bulk_error : written` into `results` for each pending write, by index. */
export const applyWriteOutcomes = ({
  pendingWrites,
  errors,
  results,
}: {
  pendingWrites: Array<ReturnType<typeof buildPendingWrite>>;
  errors: Array<CompactBulkError | undefined>;
  results: BulkResults;
}): void => {
  pendingWrites.forEach(({ candidate, status, narrativePreserved, severity }, responseIndex) => {
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
      return;
    }
    const result: EventsWriteResult = {
      index: candidate.index,
      event_id: candidate.eventId,
      status,
      written: true,
      severity,
    };
    if (narrativePreserved) {
      result.narrative_preserved = true;
    }
    results[candidate.index] = result;
  });
};
