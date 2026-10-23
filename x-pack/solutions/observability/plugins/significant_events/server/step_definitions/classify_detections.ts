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
  type SkipMarker,
} from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  classifyDetection,
  toMemberState,
  type DetectionClassification,
  type ProbeOutcome,
} from './classify_detection';
import { observeMatchSeries } from './baseline';
import { batchEntrySchema, toBatchEntry, type BatchEntry } from './detection_batch';
import { runProbe, runStoredQuery, type ProbeResult, type StoredQueryRunner } from './run_probe';
import {
  RuleEventsClient,
  type LiveRuleMembership,
} from '../lib/significant_events/events/rule_events_client';

/** Rows beyond this are not classified: they go to the agent untouched. */
export const MAX_CLASSIFIED_ROWS = 100;
const MAX_INPUT_ROWS = 1_000;
const MAX_ROW_COLUMNS = 20;

const rowsSchema = lazySchema(() =>
  z.array(z.array(z.unknown()).max(MAX_ROW_COLUMNS)).max(MAX_INPUT_ROWS)
);

const inputSchema = lazySchema(() =>
  z.object({
    /** The `get_detections` rows: `[rule_uuid, _source, ...]`. Absent when that query had none. */
    rows: rowsSchema.optional(),
    /** The names of the row columns, in order, so each detection can be handed over by field name. */
    columns: z.array(z.string().max(64)).max(MAX_ROW_COLUMNS),
    space_id: z.string().max(MAX_ID_LENGTH),
    probe_window_minutes: z.number().int().min(15).max(360),
    probe_timeout_ms: z.number().int().min(1_000).max(30_000),
    probe_concurrency: z.number().int().min(1).max(10),
    budget_ms: z.number().int().min(2_000).max(60_000),
    max_skip_age_hours: z
      .number()
      .min(1)
      .max(24 * 30),
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
    needs_agent_count: z.number().int().min(0),
    reason_counts: countsSchema,
    probe_status_counts: countsSchema,
    /**
     * The skipped detections the classifier judged. A rule's older unprocessed detections are
     * stamped with them; a newer one, which the classifier never saw, is not.
     */
    skipped_detection_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
  })
);

export type ClassifyDetectionsOutput = z.infer<typeof outputSchema>;

const NOT_PROBED: ProbeOutcome = { status: 'no_query', hasRows: false };

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

/** A skip is only as good as the verdict it rests on: an old verdict or a joining rule withdraws it. */
const withEscalation = ({
  classification,
  memberships,
  maxSkipAgeMs,
  now,
  joiningEventIds,
  baseline,
}: {
  classification: DetectionClassification;
  memberships: readonly LiveRuleMembership[];
  maxSkipAgeMs: number;
  now: number;
  joiningEventIds: ReadonlySet<string>;
  baseline: BaselineObservation | undefined;
}): DetectionClassification => {
  if (classification.decision !== 'skip') return classification;
  // A match count above the rule's own normal is a change the stored verdict has not seen.
  if (baseline?.decision === 'above_normal')
    return { decision: 'needs_agent', reason: 'above_normal' };
  // The age of the agent's last verdict for the rule. The agent writes that time, so one that is
  // missing, unreadable or in the future is not trusted: the age falls back to when the series opened.
  const isTooOld = memberships.some(({ verifiedAt, createdAt }) => {
    const verified = verifiedAt === undefined ? NaN : Date.parse(verifiedAt);
    const anchor = verified <= now ? verifiedAt : createdAt;
    return anchor !== undefined && now - Date.parse(anchor) > maxSkipAgeMs;
  });
  if (isTooOld) return { decision: 'needs_agent', reason: 'series_too_old' };
  // A skip names the live event it rests on. A membership with no event id cannot be named, so the
  // agent decides.
  if (memberships.some(({ eventId }) => eventId === undefined)) {
    return { decision: 'needs_agent', reason: 'not_live_member' };
  }
  const isJoining = memberships.some(
    ({ eventId }) => eventId !== undefined && joiningEventIds.has(eventId)
  );
  return isJoining ? { decision: 'needs_agent', reason: 'member_joining' } : classification;
};

/** A rule needs a probe only when every one of its live series judged it. */
const needsProbe = (series: readonly LiveRuleMembership[]): boolean =>
  series.length > 0 && series.every(({ verdict }) => toMemberState(verdict) !== 'unjudged');

export interface ClassifyBatchParams {
  rows: ReadonlyArray<readonly unknown[]>;
  /** The names of the row columns, in order. */
  columns: readonly string[];
  /** A skip is withdrawn when the verdict it rests on is older than this. */
  maxSkipAgeMs: number;
  /** The clock the series ages are read against. */
  now: number;
  /** How far back the probe looked, so a skip can say what it saw. */
  probeWindowMinutes: number;
  probeConcurrency: number;
  /** The live series each rule is in. Called once. */
  findLiveMemberships: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
  /** Re-runs a stored query once; must not throw. */
  probe: (query: string | undefined) => Promise<ProbeResult>;
  /** Is the detection above its own normal? A skip is withdrawn when it is. */
  observe: (query: string | undefined) => Promise<BaselineObservation | undefined>;
}

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
  probeConcurrency,
  findLiveMemberships,
  probe,
  observe,
}: ClassifyBatchParams): Promise<ClassifyDetectionsOutput> => {
  const entries = rows.map((row) => toBatchEntry({ columns, row }));
  const classifiable = entries.flatMap(({ rule_uuid: ruleUuid, source_id: sourceId }, index) =>
    ruleUuid && index < MAX_CLASSIFIED_ROWS ? [{ ruleUuid, sourceId }] : []
  );
  const ruleUuids = [...new Set(classifiable.map(({ ruleUuid }) => ruleUuid))];
  const memberships = await findLiveMemberships(ruleUuids);

  const limiter = pLimit(probeConcurrency);
  const probes = new Map<string, ProbeResult>();
  const baselines = new Map<string, BaselineObservation>();
  await Promise.all(
    [...memberships.entries()]
      .filter(([, series]) => needsProbe(series))
      .map(([ruleUuid, series]) =>
        limiter(async () => {
          const queryVariants = new Set(series.map(({ esqlQuery }) => esqlQuery ?? null));
          if (queryVariants.size > 1) {
            // A single probe cannot validate memberships backed by different stored queries.
            // Fail open rather than applying one query's result to another membership.
            probes.set(ruleUuid, { status: 'no_query', hasRows: false, durationMs: 0 });
            return;
          }
          const storedQuery = series.find(({ esqlQuery }) => esqlQuery !== undefined)?.esqlQuery;
          const [probed, observed] = await Promise.all([probe(storedQuery), observe(storedQuery)]);
          probes.set(ruleUuid, probed);
          if (observed) baselines.set(ruleUuid, observed);
        })
      )
  );

  const joiningEventIds = findJoinedSeries({ detections: classifiable, memberships });

  const reasons: string[] = [];
  const probeStatuses: string[] = [];
  const skips: Array<{ rule_uuid: string; skip: SkipMarker }> = [];
  const skippedDetectionIds: string[] = [];
  const batch: BatchEntry[] = [];
  entries.forEach((entry, index) => {
    const { rule_uuid: ruleUuid, detection_id: detectionId } = entry;
    if (!ruleUuid) {
      batch.push(entry);
      return;
    }
    const probed = probes.get(ruleUuid);
    const baseline = baselines.get(ruleUuid);
    const series = memberships.get(ruleUuid) ?? [];
    let classification: DetectionClassification;
    if (entry.flaky_probe === true) {
      classification = { decision: 'needs_agent', reason: 'flaky_probe' };
    } else if (index >= MAX_CLASSIFIED_ROWS) {
      classification = { decision: 'needs_agent', reason: 'over_cap' };
    } else {
      classification = withEscalation({
        classification: classifyDetection({
          memberships: series,
          probe: probed ?? NOT_PROBED,
        }),
        memberships: series,
        maxSkipAgeMs,
        now,
        joiningEventIds,
        baseline,
      });
    }
    reasons.push(classification.reason);
    if (probed) probeStatuses.push(probed.status);

    if (classification.decision === 'needs_agent') {
      // Only the rows the agent reads carry a hint.
      batch.push({
        ...entry,
        classifier: {
          reason: classification.reason,
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
      return;
    }

    // `withEscalation` sends a skip to the agent unless its series names the event it rests on.
    const [member] = series;
    if (member?.eventId === undefined) {
      throw new Error(`The skip for rule ${ruleUuid} names no live event.`);
    }
    skips.push({
      rule_uuid: ruleUuid,
      skip: {
        reason: classification.reason,
        ...(probed ? { probe_status: probed.status } : {}),
        ...(baseline ? { baseline } : {}),
        ...(probed?.status === 'ok'
          ? { probe_has_rows: probed.hasRows, probe_window_minutes: probeWindowMinutes }
          : {}),
        event_id: member.eventId,
        ...(member.eventTitle ? { event_title: member.eventTitle } : {}),
        stored_verdict: member.verdict,
      },
    });
    if (detectionId) skippedDetectionIds.push(detectionId);
  });

  return {
    batch,
    row_count: batch.length,
    skipped_rule_uuids: [...new Set(skips.map(({ rule_uuid: ruleUuid }) => ruleUuid))],
    skips,
    skipped_count: skips.length,
    needs_agent_count: reasons.length - skips.length,
    reason_counts: countBy(reasons),
    probe_status_counts: countBy(probeStatuses),
    skipped_detection_ids: skippedDetectionIds,
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
      } = context.input;
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
        probeConcurrency,
        // A live series with no write for longer than the skip age cannot rest a skip anyway.
        findLiveMemberships: (ruleUuids) =>
          ruleEventsClient.findLiveMemberships({
            ruleUuids,
            from: new Date(now - maxSkipAgeHours * 3_600_000).toISOString(),
          }),
        probe: (query) => runProbe({ query, window, run }),
        // Costs a second query per probed rule.
        observe: (query) => observeMatchSeries({ query, now, run }),
      });

      logger.info(
        `classifyDetections ${JSON.stringify({
          detections: output.skipped_count + output.needs_agent_count,
          skipped: output.skipped_count,
          needs_agent: output.needs_agent_count,
          reasons: output.reason_counts,
          probes: output.probe_status_counts,
        })}`
      );
      return { output };
    },
  });
