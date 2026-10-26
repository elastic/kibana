/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { countBy } from 'lodash';
import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import {
  MAX_ID_LENGTH,
  skipMarkerSchema,
  type BaselineObservation,
  type NeedsAgentReason,
  type SkipMarker,
} from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  classifyDetection,
  toMemberState,
  type DetectionClassification,
} from './classify_detection';
import {
  MIN_BASELINE_SAMPLES,
  changeSinceJudged,
  countAt,
  countsAfter,
  hasRowsAt,
  observationAt,
  observeMatchSeries,
  seenAt,
  shiftFrom,
  type MatchSeries,
} from '../lib/significant_events/rules/baseline';
import {
  batchEntrySchema,
  isHeldBack,
  lastReviewedAt,
  toBatchEntry,
  type BatchEntry,
} from './detection_batch';
import {
  runProbe,
  runStoredQuery,
  type ProbeOutcome,
  type ProbeResult,
  type StoredQueryRunner,
} from '../lib/significant_events/rules/run_probe';
import {
  RuleEventsClient,
  type LiveRuleMembership,
} from '../lib/significant_events/events/rule_events_client';

/** Rows beyond this are not classified: they go to the agent untouched. */
export const MAX_CLASSIFIED_ROWS = 100;
const MAX_INPUT_ROWS = 1_000;
const MAX_ROW_COLUMNS = 20;
/** A rule's match series holds at most this many buckets, so one read stays bounded. */
const MAX_SERIES_BUCKETS = 288;
/** The reasons that mean the rule's data changed, as opposed to the classifier being unsure. */
const CHANGE_REASONS: ReadonlySet<NeedsAgentReason> = new Set([
  'state_changed',
  'above_normal',
  'below_judged',
]);

const rowsSchema = lazySchema(() =>
  z.array(z.array(z.unknown()).max(MAX_ROW_COLUMNS)).max(MAX_INPUT_ROWS)
);

const inputSchema = lazySchema(() =>
  z.object({
    /**
     * The `get_detections` rows: `[rule_uuid, _source, ...]`. Absent when that query had none. A row
     * the flaky-rule gate held back says so in its `held_back` column: the classifier may skip it
     * when its live event still holds, and never hands it to the agent.
     */
    rows: rowsSchema.optional(),
    /**
     * The names of the row columns, in order, so each detection can be handed over by field name.
     * Absent with the rows when `get_detections` failed: an empty batch.
     */
    columns: z.array(z.string().max(64)).max(MAX_ROW_COLUMNS).default([]),
    space_id: z.string().max(MAX_ID_LENGTH),
    probe_window_minutes: z.number().int().min(15).max(360),
    probe_timeout_ms: z.number().int().min(1_000).max(30_000),
    probe_concurrency: z.number().int().min(1).max(10),
    budget_ms: z.number().int().min(2_000).max(60_000),
    max_skip_age_hours: z
      .number()
      .min(1)
      .max(24 * 30),
    /** How long the agent's last review of a rule stands in for its verdict while nothing changed. */
    review_fresh_minutes: z.number().int().min(15).max(1_440).default(240),
    /** The bucket size and the history of the rule's match series. */
    baseline_bucket_minutes: z.number().int().min(1).max(60).default(5),
    baseline_window_minutes: z.number().int().min(60).max(1_440).default(300),
  })
);

const countsSchema = lazySchema(() => z.record(z.string().max(64), z.number().int().min(0)));

const outputSchema = lazySchema(() =>
  z.object({
    /** The detections the agent reads, by field name: only the `needs_agent` ones. */
    batch: z.array(batchEntrySchema).max(MAX_INPUT_ROWS),
    /** Rules whose detections are stamped processed. */
    skipped_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** Why each skipped rule was skipped, in the shape a processed marker stores. */
    skips: z
      .array(z.object({ rule_uuid: z.string().max(MAX_ID_LENGTH), skip: skipMarkerSchema }))
      .max(MAX_INPUT_ROWS),
    /** Number of detections in `batch`; a numeric field so workflows can tell an empty batch from a missing output. */
    row_count: z.number().int().min(0),
    skipped_count: z.number().int().min(0),
    /** Held-back detections the classifier would have sent to the agent: they stay pending. */
    held_back_count: z.number().int().min(0),
    needs_agent_count: z.number().int().min(0),
    reason_counts: countsSchema,
    probe_status_counts: countsSchema,
    /**
     * The skipped detections the classifier judged. A rule's older unprocessed detections are
     * stamped with them; a newer one, which the classifier never saw, is not.
     */
    skipped_detection_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** The classification itself failed: `batch` holds every row the agent may read, unjudged. */
    failed: z.boolean(),
  })
);

export type ClassifyDetectionsOutput = z.infer<typeof outputSchema>;

const NOT_PROBED: ProbeOutcome = { status: 'no_query', hasRows: false };

/** A rule's match series, and its latest bucket observed against the rest. */
interface ObservedSeries {
  observation: BaselineObservation;
  series: MatchSeries;
}

/**
 * What the classifier decided for one detection: a `DetectionClassification`, or a skip because the
 * agent already reviewed what would otherwise have reached it (`absorbedReason`).
 */
type RowDecision =
  | DetectionClassification
  | {
      decision: 'skip';
      reason: 'already_reviewed';
      absorbedReason: NeedsAgentReason;
      reviewedAt: number;
    };

/** A time the agent wrote, if it can be trusted: readable and not in the future. */
const trustedTime = (isoTime: string | undefined, now: number): number | undefined => {
  const time = isoTime === undefined ? NaN : Date.parse(isoTime);
  return time <= now ? time : undefined;
};

/** The newest verdict time of the rule's live series, if every one of them can be trusted. */
const newestVerdictTime = (
  memberships: readonly LiveRuleMembership[],
  now: number
): number | undefined => {
  const times = memberships.map(({ verifiedAt }) => trustedTime(verifiedAt, now));
  return times.length === 0 || times.includes(undefined)
    ? undefined
    : Math.max(...(times as number[]));
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
 * The time of the agent's last review of a rule, when it can stand in for the verdict: inside the
 * review window, after every verdict of the rule's live series, before the latest bucket, and with
 * the rule's own series unchanged since — the same matches over the probe span, and no bucket since
 * (the latest included) shifting up from the count at the review. A rule with an unjudged member has
 * no verdict to compare the probe to, so the probe must also agree with the matches at the review:
 * the series ends before the current bucket and cannot show a rule that only just started matching.
 * The review is recorded when the run ends, so a detection at or before that time may have arrived
 * mid-run and never been in the agent's batch: it is never covered. Any doubt (no series, an
 * untrusted verdict time, an unknown detection time, a review the series cannot show) means no
 * fresh review.
 */
const freshReviewTime = ({
  reviewedAt,
  detectedAt,
  memberships,
  observed,
  probed,
  now,
  reviewFreshMs,
  probeSpanBuckets,
}: {
  reviewedAt: number | undefined;
  /** When the detection being classified fired. */
  detectedAt: number | undefined;
  memberships: readonly LiveRuleMembership[];
  observed: ObservedSeries | undefined;
  probed: ProbeResult | undefined;
  now: number;
  reviewFreshMs: number;
  probeSpanBuckets: number;
}): number | undefined => {
  if (reviewedAt === undefined || observed === undefined) {
    return undefined;
  }
  if (detectedAt === undefined || detectedAt <= reviewedAt) {
    return undefined;
  }
  const verdictTime = newestVerdictTime(memberships, now);
  if (verdictTime === undefined || reviewedAt <= verdictTime) {
    return undefined;
  }
  if (!isWithinReviewWindow({ reviewedAt, now, reviewFreshMs })) {
    return undefined;
  }

  const { series } = observed;
  const latestStart = series.firstStart + (series.counts.length - 1) * series.bucketMs;
  // The latest bucket is only complete once it has ended, so a review inside it cannot be compared.
  if (reviewedAt >= latestStart) {
    return undefined;
  }
  // What the review could have seen is the last complete bucket before its own: the bucket that
  // holds it is later activity.
  const seen = seenAt(series, reviewedAt);
  const rowsThen = hasRowsAt({ series, time: seen, spanBuckets: probeSpanBuckets });
  const rowsNow = hasRowsAt({ series, time: latestStart, spanBuckets: probeSpanBuckets });
  const countThen = countAt(series, seen);
  if (rowsThen === undefined || countThen === undefined || rowsThen !== rowsNow) {
    return undefined;
  }

  const isProbeAgreeing = probed?.status === 'ok' && probed.hasRows === rowsThen;
  if (!needsProbe(memberships) && !isProbeAgreeing) {
    return undefined;
  }

  const hasShiftedUp = countsAfter(series, seen).some(
    (count) => shiftFrom({ value: count, from: countThen }) === 'up'
  );
  const hasShiftedSince = shiftFrom({ value: observed.observation.value, from: countThen });
  return hasShiftedUp || hasShiftedSince ? undefined : reviewedAt;
};

/** The probe window in series buckets, rounded up: at least one bucket. */
export const probeSpanInBuckets = ({
  probeWindowMinutes,
  bucketMinutes,
}: {
  probeWindowMinutes: number;
  bucketMinutes: number;
}): number => Math.max(1, Math.ceil(probeWindowMinutes / bucketMinutes));

/** Why the series inputs cannot be read together, if they cannot. */
export const seriesShapeProblem = ({
  bucketMinutes,
  windowMinutes,
  probeWindowMinutes,
}: {
  bucketMinutes: number;
  windowMinutes: number;
  probeWindowMinutes: number;
}): string | undefined => {
  const buckets = Math.floor(windowMinutes / bucketMinutes);
  if (buckets < MIN_BASELINE_SAMPLES + 1 || buckets > MAX_SERIES_BUCKETS) {
    return `classifierBaselineWindowMinutes / classifierBaselineBucketMinutes must give ${
      MIN_BASELINE_SAMPLES + 1
    } to ${MAX_SERIES_BUCKETS} buckets (got ${buckets}); the classifier is not judging this run`;
  }
  if (bucketMinutes > probeWindowMinutes) {
    return 'classifierBaselineBucketMinutes must not exceed classifierProbeWindowMinutes; the classifier is not judging this run';
  }
  return undefined;
};

/**
 * The live series that a detection is joining: it arrives for a source the series covers while its
 * rule is in no live series. A member of any live series is judged by its own series instead, so
 * two members of different series on one source do not withdraw each other's skip.
 */
const findJoinedSeries = ({
  detections,
  memberships,
}: {
  detections: ReadonlyArray<{ ruleUuid: string; sourceId: string | undefined }>;
  memberships: ReadonlyMap<string, readonly LiveRuleMembership[]>;
}): Set<string> => {
  const joined = new Set<string>();
  const allSeries = [...memberships.values()].flat();
  for (const { ruleUuid, sourceId } of detections) {
    if (sourceId === undefined) continue;
    if ((memberships.get(ruleUuid) ?? []).length > 0) continue;
    for (const { eventId, sourceIds } of allSeries) {
      if (eventId !== undefined && sourceIds.includes(sourceId)) {
        joined.add(eventId);
      }
    }
  }
  return joined;
};

/**
 * The levels a verdict or review could have judged at: the last complete bucket before its own
 * (`seen`), and its own bucket (`own`), which can include matches that came after it. They differ
 * when the count moved inside that bucket, up or down, and which one it judged is unknown.
 */
interface JudgedLevels {
  seen: BaselineObservation | undefined;
  own: BaselineObservation | undefined;
}

/**
 * The reason a count changed against the level a verdict or review saw, if it did. Which of the two
 * levels it judged at is unknown, so a change against either reaches the agent.
 */
const changeReason = ({
  observed,
  judged,
}: {
  observed: BaselineObservation | undefined;
  judged: JudgedLevels;
}): NeedsAgentReason | undefined => {
  if (!observed) return undefined;
  const changes = [judged.seen, judged.own].map((level) =>
    changeSinceJudged({ observed, judged: level })
  );
  if (changes.includes('rose')) return 'above_normal';
  return changes.includes('recovered') ? 'below_judged' : undefined;
};

/** Whether a verdict is older than the limit; an untrusted verdict time falls back to the series' age. */
const isSeriesTooOld = ({
  memberships,
  now,
  maxSkipAgeMs,
}: {
  memberships: readonly LiveRuleMembership[];
  now: number;
  maxSkipAgeMs: number;
}): boolean =>
  memberships.some(({ verifiedAt, createdAt }) => {
    const anchor = trustedTime(verifiedAt, now) === undefined ? createdAt : verifiedAt;
    return anchor !== undefined && now - Date.parse(anchor) > maxSkipAgeMs;
  });

/**
 * Settles a skip, or an unjudged member, against what the stored verdict has not seen: a change in
 * the match count, an old verdict, a member that cannot be judged. Each reaches the agent, unless a
 * fresh agent review already saw it, in which case it is skipped as `already_reviewed`. A skip also
 * needs a live event to rest on, and no rule joining that event.
 */
const reconcileSkip = ({
  classification,
  memberships,
  maxSkipAgeMs,
  now,
  joiningEventIds,
  baseline,
  judgedAtVerdict,
  judgedAtReview,
  freshReviewAt,
}: {
  classification: DetectionClassification;
  memberships: readonly LiveRuleMembership[];
  maxSkipAgeMs: number;
  now: number;
  joiningEventIds: ReadonlySet<string>;
  baseline: BaselineObservation | undefined;
  /** The level the verdict was made at, and the level of the fresh review, read from the series. */
  judgedAtVerdict: JudgedLevels;
  judgedAtReview: JudgedLevels;
  freshReviewAt: number | undefined;
}): RowDecision => {
  const isUnjudged =
    classification.decision === 'needs_agent' && classification.reason === 'unjudged_member';
  if (classification.decision === 'needs_agent' && !isUnjudged) return classification;

  const unseenReason: NeedsAgentReason | undefined = isUnjudged
    ? 'unjudged_member'
    : changeReason({ observed: baseline, judged: judgedAtVerdict }) ??
      (isSeriesTooOld({ memberships, now, maxSkipAgeMs }) ? 'series_too_old' : undefined);
  const changeSinceReview =
    freshReviewAt === undefined
      ? undefined
      : changeReason({ observed: baseline, judged: judgedAtReview });
  const absorbingReview = changeSinceReview === undefined ? freshReviewAt : undefined;
  if (unseenReason !== undefined && absorbingReview === undefined) {
    return { decision: 'needs_agent', reason: changeSinceReview ?? unseenReason };
  }
  // A skip names the live event it rests on. A membership with no event id cannot be named.
  if (memberships.some(({ eventId }) => eventId === undefined)) {
    return { decision: 'needs_agent', reason: 'not_live_member' };
  }
  if (memberships.some(({ eventId }) => eventId !== undefined && joiningEventIds.has(eventId))) {
    return { decision: 'needs_agent', reason: 'member_joining' };
  }
  return unseenReason === undefined || absorbingReview === undefined
    ? classification
    : {
        decision: 'skip',
        reason: 'already_reviewed',
        absorbedReason: unseenReason,
        reviewedAt: absorbingReview,
      };
};

/**
 * A rule the agent has since judged in a newer live series is not still waiting on the older one:
 * its newest verdict supersedes the rest. Only a verdict time that can be trusted (readable, not in
 * the future) supersedes or is superseded, so any doubt keeps every series and the agent decides.
 */
const dropSupersededMemberships = ({
  memberships,
  now,
}: {
  memberships: readonly LiveRuleMembership[];
  now: number;
}): LiveRuleMembership[] => {
  const newest = Math.max(
    ...memberships.map(({ verifiedAt }) => trustedTime(verifiedAt, now) ?? -Infinity)
  );
  return memberships.filter(({ verifiedAt }) => {
    const time = trustedTime(verifiedAt, now);
    return time === undefined || time >= newest;
  });
};

/** A rule needs a probe only when every one of its live series judged it. */
const needsProbe = (series: readonly LiveRuleMembership[]): boolean =>
  series.length > 0 && series.every(({ verdict }) => toMemberState(verdict) !== 'unjudged');

/**
 * Probes and observes the rules that need it, at most `probeConcurrency` at once. A judged rule is
 * probed; one with an agent review is observed and probed even when unjudged, since the review needs
 * its series and the probe's proof that nothing started since.
 * Rules the agent may read go first, so a spent budget never costs them their read.
 */
const readSeries = async ({
  memberships,
  reviewedRuleUuids,
  heldBackRuleUuids,
  probeConcurrency,
  probe,
  observe,
}: {
  memberships: ReadonlyMap<string, readonly LiveRuleMembership[]>;
  reviewedRuleUuids: ReadonlySet<string>;
  heldBackRuleUuids: ReadonlySet<string>;
  probeConcurrency: number;
  probe: ClassifyBatchParams['probe'];
  observe: ClassifyBatchParams['observe'];
}) => {
  const limiter = pLimit(probeConcurrency);
  const probes = new Map<string, ProbeResult>();
  const observations = new Map<string, ObservedSeries>();
  await Promise.all(
    [...memberships.entries()]
      .filter(
        ([ruleUuid, series]) =>
          needsProbe(series) || (series.length > 0 && reviewedRuleUuids.has(ruleUuid))
      )
      .sort(([a], [b]) => Number(heldBackRuleUuids.has(a)) - Number(heldBackRuleUuids.has(b)))
      .map(([ruleUuid, series]) =>
        limiter(async () => {
          const isJudged = needsProbe(series);
          const queryVariants = new Set(series.map(({ esqlQuery }) => esqlQuery ?? null));
          if (queryVariants.size > 1) {
            // A single probe cannot validate memberships backed by different stored queries.
            // Fail open rather than applying one query's result to another membership.
            if (isJudged)
              probes.set(ruleUuid, { status: 'no_query', hasRows: false, durationMs: 0 });
            return;
          }
          const storedQuery = series.find(({ esqlQuery }) => esqlQuery !== undefined)?.esqlQuery;
          const [probed, observed] = await Promise.all([
            isJudged || reviewedRuleUuids.has(ruleUuid) ? probe(storedQuery) : undefined,
            observe(storedQuery),
          ]);
          if (probed) probes.set(ruleUuid, probed);
          if (observed) observations.set(ruleUuid, observed);
        })
      )
  );
  return { probes, observations };
};

export interface ClassifyBatchParams {
  /** A row with `held_back` set is classified like any other, but never handed to the agent. */
  rows: ReadonlyArray<readonly unknown[]>;
  /** The names of the row columns, in order. */
  columns: readonly string[];
  /** A skip is withdrawn when the verdict it rests on is older than this. */
  maxSkipAgeMs: number;
  /** The clock the series ages are read against. */
  now: number;
  /** How far back the probe looked, so a skip can say what it saw. */
  probeWindowMinutes: number;
  /** The probe window in series buckets, to compare the matches at a review with the matches now. */
  probeSpanBuckets: number;
  /** How long the agent's last review of a rule stands in for its verdict. */
  reviewFreshMs: number;
  probeConcurrency: number;
  /** The live series each rule is in. Called once. */
  findLiveMemberships: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
  /** Re-runs a stored query once; must not throw. */
  probe: (query: string | undefined) => Promise<ProbeResult>;
  /** The rule's match series: is it above its own normal, and what did it look like before? */
  observe: (query: string | undefined) => Promise<ObservedSeries | undefined>;
}

/** What `classifyBatch` knows of one rule when it decides on a row. */
interface RowContext
  extends Pick<ClassifyBatchParams, 'maxSkipAgeMs' | 'now' | 'probeSpanBuckets' | 'reviewFreshMs'> {
  joiningEventIds: ReadonlySet<string>;
}

/** Decides one detection of a rule that has an id: the agent, or a skip. Pure. */
const decideRow = ({
  entry,
  index,
  memberships,
  probed,
  observed,
  reviewedAt,
  context,
}: {
  entry: BatchEntry;
  index: number;
  memberships: readonly LiveRuleMembership[];
  probed: ProbeResult | undefined;
  observed: ObservedSeries | undefined;
  reviewedAt: number | undefined;
  context: RowContext;
}): RowDecision => {
  if (entry.flaky_probe === true) return { decision: 'needs_agent', reason: 'flaky_probe' };
  if (index >= MAX_CLASSIFIED_ROWS) return { decision: 'needs_agent', reason: 'over_cap' };
  const { now, maxSkipAgeMs, reviewFreshMs, probeSpanBuckets, joiningEventIds } = context;
  const detectedAt = Date.parse(entry['@timestamp'] ?? '');
  const freshReviewAt = freshReviewTime({
    reviewedAt,
    detectedAt: Number.isNaN(detectedAt) ? undefined : detectedAt,
    memberships,
    observed,
    probed,
    now,
    reviewFreshMs,
    probeSpanBuckets,
  });
  const levelsAt = (time: number | undefined): JudgedLevels =>
    observed && time !== undefined
      ? {
          seen: observationAt(observed.series, seenAt(observed.series, time)),
          own: observationAt(observed.series, time),
        }
      : { seen: undefined, own: undefined };
  return reconcileSkip({
    classification: classifyDetection({ memberships, probe: probed ?? NOT_PROBED }),
    memberships,
    maxSkipAgeMs,
    now,
    joiningEventIds,
    baseline: observed?.observation,
    judgedAtVerdict: levelsAt(newestVerdictTime(memberships, now)),
    judgedAtReview: levelsAt(freshReviewAt),
    freshReviewAt,
  });
};

/**
 * A held-back rule's change reaches the agent at most once per review window: one that keeps
 * changing inside it is flapping. Only a change counts; anything else the gate held stays held.
 */
const staysHeldBack = ({
  decision,
  reviewedAt,
  now,
  reviewFreshMs,
}: {
  decision: RowDecision;
  reviewedAt: number | undefined;
  now: number;
  reviewFreshMs: number;
}): boolean =>
  decision.decision === 'needs_agent' &&
  (!CHANGE_REASONS.has(decision.reason) ||
    (reviewedAt !== undefined && isWithinReviewWindow({ reviewedAt, now, reviewFreshMs })));

/** The detection as the agent reads it, with why it reached the agent and where its rule sits. */
const toAgentEntry = ({
  entry,
  reason,
  probed,
  baseline,
  series,
}: {
  entry: BatchEntry;
  reason: NeedsAgentReason;
  probed: ProbeResult | undefined;
  baseline: BaselineObservation | undefined;
  series: readonly LiveRuleMembership[];
}): BatchEntry => ({
  ...entry,
  classifier: {
    reason,
    ...(probed ? { probe_status: probed.status } : {}),
    ...(probed?.status === 'ok' ? { probe_has_rows: probed.hasRows } : {}),
    ...(baseline ? { baseline } : {}),
    live_events: series.map(({ eventId, status, verdict, evidenceFound }) => ({
      ...(eventId ? { event_id: eventId } : {}),
      status,
      stored_verdict: verdict,
      ...(verdict === 'refutes' ? { evidence_found: evidenceFound } : {}),
    })),
  },
});

/** Why the classifier skipped the rule, in the shape a processed marker stores. */
const toSkipMarker = ({
  decision,
  member,
  probed,
  baseline,
  probeWindowMinutes,
}: {
  decision: Extract<RowDecision, { decision: 'skip' }>;
  member: LiveRuleMembership;
  probed: ProbeResult | undefined;
  baseline: BaselineObservation | undefined;
  probeWindowMinutes: number;
}): SkipMarker => {
  if (member.eventId === undefined) {
    // `reconcileSkip` sends a skip to the agent unless its series names the event it rests on.
    throw new Error('The skip names no live event.');
  }
  return {
    reason: decision.reason,
    ...(probed ? { probe_status: probed.status } : {}),
    ...(baseline ? { baseline } : {}),
    ...(probed?.status === 'ok'
      ? { probe_has_rows: probed.hasRows, probe_window_minutes: probeWindowMinutes }
      : {}),
    event_id: member.eventId,
    ...(member.eventTitle ? { event_title: member.eventTitle } : {}),
    stored_verdict: member.verdict,
    ...('absorbedReason' in decision
      ? {
          reviewed_at: new Date(decision.reviewedAt).toISOString(),
          absorbed_reason: decision.absorbedReason,
        }
      : {}),
  };
};

/**
 * Decides, per detection row, whether the discovery agent needs to see it: rows classified `skip`
 * are dropped. Rows that cannot be read, or fall beyond `MAX_CLASSIFIED_ROWS`, are always kept.
 */
export const classifyBatch = async ({
  rows,
  columns,
  maxSkipAgeMs,
  now,
  probeWindowMinutes,
  probeSpanBuckets,
  reviewFreshMs,
  probeConcurrency,
  findLiveMemberships,
  probe,
  observe,
}: ClassifyBatchParams): Promise<ClassifyDetectionsOutput> => {
  const entries = rows.map((row) => toBatchEntry({ columns, row }));
  const heldBack = rows.map((row) => isHeldBack({ columns, row }));
  // One row per rule: the agent's last review of each.
  const reviews = new Map(
    entries.flatMap(({ rule_uuid: ruleUuid }, index) => {
      const reviewedAt = lastReviewedAt({ columns, row: rows[index] });
      return ruleUuid && reviewedAt !== undefined ? [[ruleUuid, reviewedAt] as const] : [];
    })
  );
  const classifiable = entries.flatMap(({ rule_uuid: ruleUuid, source_id: sourceId }, index) =>
    ruleUuid && index < MAX_CLASSIFIED_ROWS ? [{ ruleUuid, sourceId, index }] : []
  );
  const ruleUuids = [...new Set(classifiable.map(({ ruleUuid }) => ruleUuid))];
  const heldBackRuleUuids = new Set(
    classifiable.filter(({ index }) => heldBack[index]).map(({ ruleUuid }) => ruleUuid)
  );
  const memberships = new Map(
    [...(await findLiveMemberships(ruleUuids)).entries()].map(([ruleUuid, series]) => [
      ruleUuid,
      dropSupersededMemberships({ memberships: series, now }),
    ])
  );
  const { probes, observations } = await readSeries({
    memberships,
    reviewedRuleUuids: new Set(reviews.keys()),
    heldBackRuleUuids,
    probeConcurrency,
    probe,
    observe,
  });
  const context: RowContext = {
    maxSkipAgeMs,
    now,
    probeSpanBuckets,
    reviewFreshMs,
    // A held-back detection does not withdraw anyone's skip: it is not on its way to the agent.
    joiningEventIds: findJoinedSeries({
      detections: classifiable.filter(({ index }) => !heldBack[index]),
      memberships,
    }),
  };

  const reasons: string[] = [];
  const probeStatuses: string[] = [];
  const skips: Array<{ rule_uuid: string; skip: SkipMarker }> = [];
  const skippedDetectionIds: string[] = [];
  const batch: BatchEntry[] = [];
  let heldBackCount = 0;
  entries.forEach((entry, index) => {
    const { rule_uuid: ruleUuid, detection_id: detectionId } = entry;
    if (!ruleUuid) {
      if (heldBack[index]) heldBackCount += 1;
      else batch.push(entry);
      return;
    }
    const probed = probes.get(ruleUuid);
    const observed = observations.get(ruleUuid);
    const series = memberships.get(ruleUuid) ?? [];
    const reviewedAt = reviews.get(ruleUuid);
    const decision = decideRow({
      entry,
      index,
      memberships: series,
      probed,
      observed,
      reviewedAt,
      context,
    });
    if (probed) probeStatuses.push(probed.status);
    if (heldBack[index] && staysHeldBack({ decision, reviewedAt, now, reviewFreshMs })) {
      heldBackCount += 1;
      return;
    }
    reasons.push(decision.reason);

    if (decision.decision === 'needs_agent') {
      batch.push(
        toAgentEntry({
          entry,
          reason: decision.reason,
          probed,
          baseline: observed?.observation,
          series,
        })
      );
      return;
    }
    skips.push({
      rule_uuid: ruleUuid,
      skip: toSkipMarker({
        decision,
        member: series[0],
        probed,
        baseline: observed?.observation,
        probeWindowMinutes,
      }),
    });
    if (detectionId) skippedDetectionIds.push(detectionId);
  });

  return {
    batch,
    row_count: batch.length,
    skipped_rule_uuids: [...new Set(skips.map(({ rule_uuid: ruleUuid }) => ruleUuid))],
    skips,
    skipped_count: skips.length,
    held_back_count: heldBackCount,
    needs_agent_count: reasons.length - skips.length,
    reason_counts: countBy(reasons),
    probe_status_counts: countBy(probeStatuses),
    skipped_detection_ids: skippedDetectionIds,
    failed: false,
  };
};

/**
 * What a failed classification hands on: every row the agent may read, unjudged, exactly as it would
 * have read them without a classifier. The rows the flaky-rule gate held back stay held back.
 */
const failOpen = ({
  rows,
  columns,
}: {
  rows: ReadonlyArray<readonly unknown[]>;
  columns: readonly string[];
}): ClassifyDetectionsOutput => {
  const open = rows.filter((row) => !isHeldBack({ columns, row }));
  return {
    batch: open.map((row) => toBatchEntry({ columns, row })),
    skipped_rule_uuids: [],
    skips: [],
    row_count: open.length,
    skipped_count: 0,
    held_back_count: rows.length - open.length,
    needs_agent_count: open.length,
    reason_counts: {},
    probe_status_counts: {},
    skipped_detection_ids: [],
    failed: true,
  };
};

export const classifyDetectionsStepDefinition = ({ logger }: { logger: Logger }) =>
  createServerStepDefinition({
    id: 'significantEvents.classifyDetections',
    label: 'Classify significant events detections',
    category: StepCategory.Elasticsearch,
    description:
      'Decides per detection whether the discovery agent needs to see it, by comparing fresh evidence from the rule’s stored query with the member state in its live series. Read-only.',
    inputSchema,
    outputSchema,
    handler: async (context) => {
      const {
        rows = [],
        columns,
        space_id: spaceId,
        probe_window_minutes: windowMinutes,
        probe_timeout_ms: timeoutMs,
        probe_concurrency: probeConcurrency,
        budget_ms: budgetMs,
        max_skip_age_hours: maxSkipAgeHours,
        review_fresh_minutes: reviewFreshMinutes,
        baseline_bucket_minutes: bucketMinutes,
        baseline_window_minutes: baselineWindowMinutes,
      } = context.input;
      const shapeProblem = seriesShapeProblem({
        bucketMinutes,
        windowMinutes: baselineWindowMinutes,
        probeWindowMinutes: windowMinutes,
      });
      if (shapeProblem) {
        logger.error(`classifyDetections sends the rows on: ${shapeProblem}`);
        return { output: failOpen({ rows, columns }) };
      }
      const esClient = context.contextManager.getScopedEsClient();
      const ruleEventsClient = new RuleEventsClient({ esClient, space: spaceId });

      const now = Date.now();
      const window = {
        from: new Date(now - windowMinutes * 60_000).toISOString(),
        to: new Date(now).toISOString(),
      };

      const run: StoredQueryRunner = (params) =>
        runStoredQuery({
          ...params,
          esClient,
          timeoutMs,
          deadlineAt: now + budgetMs,
          abortSignal: context.abortSignal,
        });

      const output = await classifyBatch({
        rows,
        columns,
        maxSkipAgeMs: maxSkipAgeHours * 3_600_000,
        now,
        probeWindowMinutes: windowMinutes,
        probeSpanBuckets: probeSpanInBuckets({ probeWindowMinutes: windowMinutes, bucketMinutes }),
        reviewFreshMs: reviewFreshMinutes * 60_000,
        probeConcurrency,
        // A live series with no write for longer than the skip age cannot rest a skip anyway.
        findLiveMemberships: (ruleUuids) =>
          ruleEventsClient.findLiveMemberships({
            ruleUuids,
            from: new Date(now - maxSkipAgeHours * 3_600_000).toISOString(),
          }),
        probe: (query) => runProbe({ query, window, run }),
        // One series query per rule that is probed or has an agent review.
        observe: (query) =>
          observeMatchSeries({
            query,
            now,
            run,
            bucketMinutes,
            windowMinutes: baselineWindowMinutes,
          }),
      }).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : String(error);
        logger.error(`classifyDetections failed, sending the rows on unjudged: ${reason}`);
        return failOpen({ rows, columns });
      });

      logger.info(
        `classifyDetections ${JSON.stringify({
          detections: output.skipped_count + output.needs_agent_count,
          skipped: output.skipped_count,
          held_back: output.held_back_count,
          failed: output.failed,
          needs_agent: output.needs_agent_count,
          reasons: output.reason_counts,
          probes: output.probe_status_counts,
        })}`
      );
      return { output };
    },
  });
