/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS,
  UNCONFIRMED_EVENT_MAX_CONFIDENCE,
  type Severity,
  type SignalEntry,
  type SignalVerdict,
  type SignificantEvent,
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
import type {
  BulkResults,
  EventsWriteInput,
  EventsWriteResult,
  LoadedCandidate,
  ResolvedWriteCandidate,
  WriteCandidate,
} from './types';

const isLiveStatus = (status: SignificantEvent['status'] | undefined): boolean =>
  SIGNIFICANT_EVENT_LIVE_STATUS_OPTIONS.some((live) => live === status);

interface EventFacts
  extends Pick<SignificantEvent, 'status' | 'severity' | 'signals' | 'confidence'> {
  candidate: ResolvedWriteCandidate;
  rest: Omit<EventsWriteInput, 'event_id'>;
  episodeContext: ReturnType<typeof mergeEpisodeContext>;
  frozenNarrative: ReturnType<typeof preserveStableNarrative>;
}

/**
 * For a live event, the versions of its current episode (after its last closed version), so a
 * reopened event does not inherit rule history from the episode it closed. A closed event keeps its
 * full history, since it can only be unchanged against what it already stored.
 */
const episodeHistory = (history: SignificantEvent[]): SignificantEvent[] => {
  const latest = history.at(-1);
  if (!isLiveStatus(latest?.status)) return history;
  const lastClosedIndex = history.map((version) => !isLiveStatus(version.status)).lastIndexOf(true);
  return history.slice(lastClosedIndex + 1);
};

/**
 * Returns true when the latest stored version for this event_id has the same severity and status
 * as the candidate and the candidate introduces no new detection rules — indicating this snapshot
 * would produce a pure-churn duplicate. `severity` is the tier this write would store, after the
 * investigation lock.
 */
export const shouldSkipAsNoOp = ({
  candidate,
  severity,
}: {
  candidate: ResolvedWriteCandidate;
  severity: Severity;
}): boolean => {
  const { latest, priorDocs } = candidate;
  if (latest === undefined) return false;

  const history = episodeHistory([...priorDocs, latest]);
  const knownRuleUuids = extractRuleUuidsFromEvents(history);
  const addsRule = addsNewDetectionRules(extractRuleUuids(candidate.input.signals), knownRuleUuids);

  return (
    latest.status === candidate.status &&
    latest.severity === severity &&
    !addsRule &&
    !changesMemberVerdict(history, candidate.input.signals)
  );
};

/**
 * True when a submitted detection signal carries a different verdict than the latest one stored
 * for its rule (across the event's versions). A member turning healthy, or breaching again, is
 * evidence the status derives from, so it must be stored even when status and severity do not move.
 */
const changesMemberVerdict = (
  priorDocs: SignificantEvent[],
  submitted: SignalEntry[] | undefined
): boolean => {
  const stored = new Map(
    mergeSignalsLatestPerRule(priorDocs, [], '').flatMap((signal) =>
      signal.type === 'detection' && signal.metadata?.rule_uuid
        ? [[signal.metadata.rule_uuid, signal.verdict] as const]
        : []
    )
  );
  return (submitted ?? []).some(
    (signal) =>
      signal.type === 'detection' &&
      signal.metadata?.rule_uuid !== undefined &&
      stored.get(signal.metadata.rule_uuid) !== signal.verdict
  );
};

const ruleOf = (signal: SignalEntry): string | undefined => signal.metadata?.rule_uuid;

/** Does this write confirm a rule the stored event did not hold as confirmed? */
const escalatesStoredVerdict = ({
  submitted,
  latest,
}: {
  submitted: SignificantEvent['signals'];
  latest: SignificantEvent | undefined;
}): boolean => {
  const stored = new Map((latest?.signals ?? []).map((signal) => [ruleOf(signal), signal.verdict]));
  return (submitted ?? []).some(
    (signal) => signal.verdict === 'confirms' && stored.get(ruleOf(signal)) !== 'confirms'
  );
};

/** A confirming signal, or an off-topic row with its own observed error: both are rated on what they show. */
export const hasConfirmingSignal = (
  signals: ReadonlyArray<{ verdict: SignalVerdict }> | undefined
): boolean =>
  (signals ?? []).some(({ verdict }) => verdict === 'confirms' || verdict === 'off_topic');

/**
 * The agent decides the tier under the `severity` field contract; the writer stores it. An inactive
 * event is `low`, so is one where no signal confirms anything, and a signal-less write (chat
 * create) keeps its explicit severity, or `low` when it gave none.
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
  if (!hasConfirmingSignal(signals)) {
    return 'low';
  }
  if (proposed === undefined) {
    throw new Error('events_write: an event with signals needs a proposed severity.');
  }
  return proposed;
};

/** Attaches each continuation's stored lineage to its candidate, so later stages never look it up. */
export const loadHistory = async ({
  eventSearchClient,
  candidates,
}: {
  eventSearchClient: RuleEventsClient;
  candidates: WriteCandidate[];
}): Promise<LoadedCandidate[]> =>
  Promise.all(
    candidates.map(async (candidate): Promise<LoadedCandidate> => {
      if (candidate.input.event_id === undefined) {
        return { ...candidate, latest: undefined, priorDocs: [] };
      }
      const { hits } = await eventSearchClient.findByEventId(candidate.eventId);
      return { ...candidate, latest: hits.at(-1), priorDocs: hits };
    })
  );

/**
 * Merges this candidate's signals and topology with its prior versions (continuation only), then
 * takes the agent's proposed severity, floors an inactive event to low and applies the
 * investigation lock — the facts shared by the no-op check and the final document, derived once per
 * candidate so the two cannot disagree.
 */
export const computeEventFacts = ({
  candidate,
  timestamp,
  source,
}: {
  candidate: ResolvedWriteCandidate;
  timestamp: string;
  source: EventsWriteSource | undefined;
}): EventFacts => {
  const { event_id: _explicitId, ...rest } = candidate.input;
  const { latest, priorDocs } = candidate;
  const isContinuation = candidate.input.event_id !== undefined;

  // A closed series that reopens starts a new episode: its stored signals belong to the closed one.
  const reopens = isContinuation && !isLiveStatus(latest?.status) && isLiveStatus(candidate.status);
  const signals =
    isContinuation && !reopens
      ? mergeSignalsLatestPerRule(priorDocs, candidate.input.signals ?? [], timestamp)
      : candidate.input.signals ?? [];

  const episodeContext = isContinuation
    ? mergeEpisodeContext(priorDocs, rest, timestamp)
    : {
        sourceIds: rest.source_ids,
        causalFeatures: rest.causal_features ?? [],
        blastRadius: rest.blast_radius ?? [],
        confidence: rest.confidence ?? 0,
      };

  const { status } = candidate;

  const severity = lockSeverityForCompletedInvestigation({
    source,
    latestEvent: latest,
    proposedSeverity: decideSeverity({ proposed: candidate.input.severity, status, signals }),
    proposedStatus: status,
    proposedSignals: candidate.input.signals,
  });

  // For continuations: if no new rule UUIDs are introduced, freeze title and symptom_hypothesis to prevent identity hijack
  // A rule that now confirms what the event stored as unconfirmed changes what the event is about:
  // its title and hypothesis must be free to say so.
  const frozenNarrative =
    isContinuation && !escalatesStoredVerdict({ submitted: candidate.input.signals, latest })
      ? preserveStableNarrative(
          extractRuleUuids(candidate.input.signals),
          latest,
          extractRuleUuidsFromEvents([...priorDocs, latest])
        )
      : undefined;

  return {
    candidate,
    rest,
    signals,
    episodeContext,
    status,
    severity,
    frozenNarrative,
    // Nothing confirmed, so nothing to be confident about; a signal-less write keeps its own.
    confidence:
      signals.length === 0 || hasConfirmingSignal(signals)
        ? episodeContext.confidence
        : Math.min(episodeContext.confidence, UNCONFIRMED_EVENT_MAX_CONFIDENCE),
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
      investigations: candidate.latest?.investigations,
      signals,
      source_ids: episodeContext.sourceIds,
      causal_features: episodeContext.causalFeatures,
      blast_radius: episodeContext.blastRadius,
      severity,
      status,
      confidence,
    },
  };
};

/** Writes `error ? bulk_error (or superseded) : written` into `results` for each pending write, by index. */
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
        reason: error.type === 'superseded_write' ? 'superseded' : 'bulk_error',
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
