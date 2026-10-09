/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignalEffect,
  SignalEntry,
  Severity,
  SignificantEvent,
} from '@kbn/significant-events-schema';
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
import { computeSeverity, deriveEventEffect } from './compute_severity';
import { computeTopologyBreadth, computeTopologyFanOut, hasCascadePath } from './topology_breadth';
import type { BulkResults, EventsWriteInput, EventsWriteResult, WriteCandidate } from './types';

interface EventFacts
  extends Pick<SignificantEvent, 'status' | 'severity' | 'signals' | 'confidence'> {
  candidate: WriteCandidate;
  rest: Omit<EventsWriteInput, 'event_id'>;
  latestEvent: SignificantEvent | undefined;
  episodeContext: ReturnType<typeof mergeEpisodeContext>;
  frozenNarrative: ReturnType<typeof preserveStableNarrative>;
  effect: SignalEffect;
}

/**
 * Returns true when the latest stored version for this event_id has the same computed severity
 * and status as the candidate and the candidate introduces no new detection rules — indicating
 * this snapshot would produce a pure-churn duplicate.
 */
const sameOutagePaths = (first: string[], second: string[]): boolean => {
  const sortedFirst = [...first].sort();
  const sortedSecond = [...second].sort();
  return (
    sortedFirst.length === sortedSecond.length &&
    sortedFirst.every((path, index) => path === sortedSecond[index])
  );
};

export const shouldSkipAsNoOp = ({
  latestEvent,
  candidate,
  priorDocs,
  computedSeverity,
  mergedSignals,
}: {
  latestEvent: SignificantEvent | undefined;
  candidate: WriteCandidate;
  priorDocs: SignificantEvent[];
  computedSeverity: Severity;
  mergedSignals: SignalEntry[] | undefined;
}): boolean => {
  if (latestEvent === undefined) return false;

  const knownRuleUuids = extractRuleUuidsFromEvents([...priorDocs, latestEvent]);
  const addsRule = addsNewDetectionRules(extractRuleUuids(candidate.input.signals), knownRuleUuids);
  const merged = deriveEventEffect(mergedSignals);
  const stored = deriveEventEffect(latestEvent.signals);
  const sameFacts =
    merged.effect === stored.effect && sameOutagePaths(merged.outagePaths, stored.outagePaths);

  return (
    latestEvent.status === candidate.input.status &&
    latestEvent.severity === computedSeverity &&
    sameFacts &&
    !addsRule
  );
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
 * computes its severity from that merged member-union — the facts shared by the no-op check and
 * the final document, computed once per candidate so neither recomputes nor disagrees with the
 * other.
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

  const { effect, outagePaths, severityScore } = deriveEventEffect(signals);
  const breadth = computeTopologyBreadth(episodeContext.causalFeatures, episodeContext.blastRadius);
  const topologyFanOut = computeTopologyFanOut(episodeContext.blastRadius);
  const cascadePath = hasCascadePath(episodeContext.blastRadius);

  // Floor to 'low' on inactive (the resolved tier, by the same convention the prompt previously wrote directly)
  const severityFromSignals =
    status === 'inactive'
      ? 'low'
      : computeSeverity({
          effect,
          outagePaths,
          breadth,
          topologyFanOut,
          hasCascadePath: cascadePath,
          severityScore,
        });
  // A signal-less write (chat create) keeps its explicit severity; signal-bearing writes always compute.
  const explicitSeverity = (signals ?? []).length === 0 ? candidate.input.severity : undefined;
  const computedSeverity = explicitSeverity ?? severityFromSignals;
  const severity = lockSeverityForCompletedInvestigation({
    source,
    latestEvent,
    computedSeverity,
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
    effect,
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
    effect,
    frozenNarrative,
    confidence,
  } = facts;

  return {
    candidate,
    status,
    narrativePreserved: frozenNarrative?.narrativePreserved,
    severity,
    effect,
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
  pendingWrites.forEach(
    ({ candidate, status, narrativePreserved, severity, effect }, responseIndex) => {
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
        effect,
      };
      if (narrativePreserved) {
        result.narrative_preserved = true;
      }
      results[candidate.index] = result;
    }
  );
};
