/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The decision, pure: from what is known of a detection's rule (its live events, whether it recorded
 * a breach, the agent's last review) to the agent or a skip, with the reason. No I/O. The order the decisions apply
 * in is stated at the top of `classify_detections.ts`.
 */

import type { NeedsAgentReason } from '@kbn/significant-events-schema';
import { classifyDetection, type DetectionClassification } from './classify_detection';
import type { BatchEntry } from './detection_batch';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';

/**
 * The pool `get_detections` returns (the managed workflow pins the same number, and a test checks
 * it). Rows beyond it are not classified: they are kept for the agent untouched, subject to the batch
 * limit. A defence: the workflow never returns more.
 */
export const MAX_CLASSIFIED_ROWS = 100;

/**
 * The reasons that show nothing observable has changed: a detection routed only for one of them may
 * wait for a run that has a detection which does (`state_changed`, `not_live_member`, or a row that
 * cannot be read).
 */
const WAITING_REASONS: ReadonlySet<NeedsAgentReason> = new Set<NeedsAgentReason>([
  'series_too_old',
  'member_joining',
  'flaky_probe',
  'unjudged_member',
]);

/** Whether a detection routed for `reason` may wait for a run that has a change. */
export const canWait = (reason: NeedsAgentReason): boolean => WAITING_REASONS.has(reason);

/** What the classifier decided for one detection: the agent, or a skip. */
export type RowDecision = DetectionClassification;

/** A time the agent wrote, if it can be trusted: readable and not in the future. */
export const trustedTime = (isoTime: string | undefined, now: number): number | undefined => {
  const time = isoTime === undefined ? NaN : Date.parse(isoTime);
  return time <= now ? time : undefined;
};

/** Whether a review lies inside the review window and not in the future. */
const isWithinReviewWindow = ({
  reviewedAt,
  now,
  reviewFreshMs,
}: {
  reviewedAt: number;
  now: number;
  reviewFreshMs: number;
}): boolean => reviewedAt <= now && now - reviewedAt <= reviewFreshMs;

/**
 * The agent's last review of the rule, if it covers a detection that fired at `detectedAt`. The review
 * is stamped when the agent's run ends, so a detection at or before the stamp may have arrived while
 * the agent ran and never been in its batch: it is not covered. An unreadable detection time is not
 * covered either.
 */
const coveringReview = ({
  reviewedAt,
  detectedAt,
}: {
  reviewedAt: number | undefined;
  detectedAt: number;
}): number | undefined =>
  reviewedAt !== undefined && detectedAt > reviewedAt ? reviewedAt : undefined;

/** Whether the rule is a member of any live event. */
export const isInLiveEvent = (memberships: readonly LiveRuleMembership[]): boolean =>
  memberships.length > 0;

/**
 * Whether a series is older than the limit, counted from the last time someone looked: its verdict
 * (an untrusted verdict time falls back to the series' age) or the agent's review when that is later.
 * A review that found nothing writes no verdict, so it is the only sign that the rule was looked at.
 * A series with no age to count from is too old: the age limit is the last guard against skipping a
 * rule for good.
 */
const isSeriesTooOld = ({
  memberships,
  now,
  maxSkipAgeMs,
  reviewedAt,
}: {
  memberships: readonly LiveRuleMembership[];
  now: number;
  maxSkipAgeMs: number;
  reviewedAt?: number;
}): boolean => {
  const trustedReviewAt = reviewedAt !== undefined && reviewedAt <= now ? reviewedAt : undefined;
  return memberships.some(({ verifiedAt, createdAt }) => {
    const anchorTime = trustedTime(verifiedAt, now) ?? trustedTime(createdAt, now);
    if (anchorTime === undefined) return true;
    const anchorAt = Math.max(anchorTime, trustedReviewAt ?? -Infinity);
    return now - anchorAt > maxSkipAgeMs;
  });
};

/**
 * Withdraws a skip when nobody has looked since the limit, when it has no live event to rest on, or
 * when a rule is joining that event: each reaches the agent. A decision that already needs the agent
 * is kept as it is.
 */
const reconcileSkip = ({
  classification,
  memberships,
  maxSkipAgeMs,
  now,
  joiningEventIds,
  reviewedAt,
}: {
  classification: DetectionClassification;
  memberships: readonly LiveRuleMembership[];
  maxSkipAgeMs: number;
  now: number;
  joiningEventIds: ReadonlySet<string>;
  /** The agent's review, when it covers the detection being decided. */
  reviewedAt: number | undefined;
}): RowDecision => {
  if (classification.decision === 'needs_agent') return classification;
  if (isSeriesTooOld({ memberships, now, maxSkipAgeMs, reviewedAt })) {
    return { decision: 'needs_agent', reason: 'series_too_old' };
  }
  // A skip names the live event it rests on. A membership with no event id cannot be named.
  if (memberships.some(({ eventId }) => eventId === undefined)) {
    return { decision: 'needs_agent', reason: 'not_live_member' };
  }
  if (memberships.some(({ eventId }) => eventId !== undefined && joiningEventIds.has(eventId))) {
    return { decision: 'needs_agent', reason: 'member_joining' };
  }
  return classification;
};

/** What `classifyBatch` knows of one rule when it decides on a row. */
export interface RowContext {
  maxSkipAgeMs: number;
  now: number;
  reviewFreshMs: number;
  joiningEventIds: ReadonlySet<string>;
}

/** When the detection fired; `NaN` when it cannot be read. */
const detectedAtOf = (entry: BatchEntry): number => Date.parse(entry['@timestamp'] ?? '');

/** Decides one detection of a rule that has an id: the agent, or a skip. Pure. */
export const decideRow = ({
  entry,
  index,
  memberships,
  breached,
  reviewedAt,
  context,
}: {
  entry: BatchEntry;
  index: number;
  memberships: readonly LiveRuleMembership[];
  /** Whether the rule recorded a breach in its last runs: its query returns rows now. */
  breached: boolean;
  reviewedAt: number | undefined;
  context: RowContext;
}): RowDecision => {
  if (index >= MAX_CLASSIFIED_ROWS) return { decision: 'needs_agent', reason: 'over_cap' };
  // A flaky rule already in a live event is decided like any other row: a skip resets the flaky
  // gate's clock, and a change reaches the agent with its own reason. Only a flaky rule in no live
  // event, which the classifier has nothing to judge against, goes to the agent as such. The cap is
  // checked first: a row past it has no memberships by construction, not because the rule is in no
  // live event.
  if (entry.flaky_probe === true && !isInLiveEvent(memberships)) {
    return { decision: 'needs_agent', reason: 'flaky_probe' };
  }
  const { now, maxSkipAgeMs, joiningEventIds } = context;
  return reconcileSkip({
    classification: classifyDetection({ memberships, breached }),
    memberships,
    maxSkipAgeMs,
    now,
    joiningEventIds,
    reviewedAt: coveringReview({ reviewedAt, detectedAt: detectedAtOf(entry) }),
  });
};

/**
 * A held-back rule's change reaches the agent at most once per review window: one that keeps
 * changing inside it is flapping. Only a change counts, and only a review that covers the held
 * detection and is inside the window holds it; anything else the gate held stays held.
 */
export const staysHeldBack = ({
  decision,
  entry,
  reviewedAt,
  now,
  reviewFreshMs,
}: {
  decision: RowDecision;
  entry: BatchEntry;
  reviewedAt: number | undefined;
  now: number;
  reviewFreshMs: number;
}): boolean => {
  if (decision.decision !== 'needs_agent') return false;
  if (decision.reason !== 'state_changed') return true;
  const covering = coveringReview({ reviewedAt, detectedAt: detectedAtOf(entry) });
  return (
    covering !== undefined && isWithinReviewWindow({ reviewedAt: covering, now, reviewFreshMs })
  );
};
