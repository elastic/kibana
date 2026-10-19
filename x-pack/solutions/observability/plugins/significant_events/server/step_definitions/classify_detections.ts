/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  DECISION_REASONS,
  PROBE_STATUSES,
  classifyDetection,
  toMemberState,
  type DetectionClassification,
  type ProbeOutcome,
} from './classify_detection';
import { BASELINE_DECISIONS, observeMatchSeries, type BaselineObservation } from './baseline';
import {
  batchEntrySchema,
  toBatchEntry,
  type BatchEntry,
  type BatchPriorSeries,
} from './detection_batch';
import { runProbe, runStoredQuery, type ProbeResult, type ProbeWindow } from './run_probe';
import {
  RuleEventsClient,
  type LiveRuleMembership,
  type PriorSeries,
} from '../lib/significant_events/events/rule_events_client';

/** Rows beyond this are not classified: they go to the agent untouched. */
export const MAX_CLASSIFIED_ROWS = 100;
const MAX_INPUT_ROWS = 1_000;
const MAX_ROW_COLUMNS = 20;
/** How far back a rule's latest series is looked for. */
const PRIOR_SERIES_LOOKBACK_MS = 14 * 24 * 60 * 60_000;

const rowsSchema = lazySchema(() =>
  z.array(z.array(z.unknown()).max(MAX_ROW_COLUMNS)).max(MAX_INPUT_ROWS)
);

const inputSchema = lazySchema(() =>
  z.object({
    /** The `get_detections` rows: `[rule_uuid, _source, ...]`. Absent when that query had none. */
    rows: rowsSchema.optional(),
    /** The names of the row columns, in order, so each detection can be handed over by field name. */
    columns: z.array(z.string().max(64)).max(MAX_ROW_COLUMNS).optional(),
    space_id: z.string().max(MAX_ID_LENGTH),
    shadow_mode: z.boolean(),
    probe_window_minutes: z.number().int().min(15).max(360),
    probe_timeout_ms: z.number().int().min(1_000).max(30_000),
    probe_concurrency: z.number().int().min(1).max(10),
    budget_ms: z.number().int().min(2_000).max(60_000),
    max_skip_age_hours: z
      .number()
      .min(1)
      .max(24 * 30),
    /** 0 turns the cooldown off. */
    cooldown_hours: z.number().min(0).max(72),
    max_cooldown_hours: z.number().min(1).max(72),
  })
);

const decisionSchema = lazySchema(() =>
  z.object({
    rule_uuid: z.string().max(MAX_ID_LENGTH),
    detection_id: z.string().max(MAX_ID_LENGTH).optional(),
    decision: z.enum(['skip', 'needs_agent']),
    reason: z.enum(DECISION_REASONS),
    probe_status: z.enum(PROBE_STATUSES).optional(),
    probe_duration_ms: z.number().int().min(0).optional(),
    baseline: z
      .object({
        decision: z.enum(BASELINE_DECISIONS),
        value: z.number(),
        samples: z.number().int().min(0),
        median: z.number().optional(),
        threshold: z.number().optional(),
      })
      .optional(),
  })
);

const countsSchema = lazySchema(() => z.record(z.string().max(64), z.number().int().min(0)));

const outputSchema = lazySchema(() =>
  z.object({
    /** Rows for the agent: every input row in shadow mode, only `needs_agent` rows otherwise. */
    rows: rowsSchema,
    /** The same detections by field name, as the agent reads them. */
    batch: z.array(batchEntrySchema).max(MAX_INPUT_ROWS),
    decisions: z.array(decisionSchema).max(MAX_INPUT_ROWS),
    /** Rules whose detections were skipped; always empty in shadow mode. */
    skipped_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** Number of rows in `rows`; a numeric field so workflows can tell an empty batch from a missing output. */
    row_count: z.number().int().min(0),
    /** Decisions made, regardless of shadow mode. */
    skipped_count: z.number().int().min(0),
    needs_agent_count: z.number().int().min(0),
    reason_counts: countsSchema,
    probe_status_counts: countsSchema,
    shadow_mode: z.boolean(),
  })
);

export type ClassifyDetectionsOutput = z.infer<typeof outputSchema>;
type DetectionRow = readonly unknown[];
type Decision = z.infer<typeof decisionSchema>;

const NOT_PROBED: ProbeOutcome = { status: 'no_query', hasRows: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseDetectionRow = (
  row: DetectionRow
):
  | { ruleUuid: string; detectionId: string | undefined; sourceId: string | undefined }
  | undefined => {
  const [ruleUuid, source] = row;
  if (typeof ruleUuid !== 'string' || ruleUuid === '') return undefined;
  const detectionId =
    isRecord(source) && typeof source.detection_id === 'string' ? source.detection_id : undefined;
  const sourceId =
    isRecord(source) && typeof source.source_id === 'string' ? source.source_id : undefined;
  return { ruleUuid, detectionId, sourceId };
};

const countBy = <T>(items: readonly T[], getKey: (item: T) => string | undefined) =>
  items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    return key === undefined ? counts : { ...counts, [key]: (counts[key] ?? 0) + 1 };
  }, {});

/**
 * The live series that a detection of another rule is joining: it arrives for a source the series
 * covers while its rule is not a member. Detections of the series' own members must be re-judged.
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
    const ownEventIds = new Set((memberships.get(ruleUuid) ?? []).map(({ eventId }) => eventId));
    for (const { eventId, sourceIds } of allSeries) {
      if (eventId !== undefined && !ownEventIds.has(eventId) && sourceIds.includes(sourceId)) {
        joined.add(eventId);
      }
    }
  }
  return joined;
};

/**
 * A rule that is in no live series and whose latest series closed on its own is left alone for a
 * while: `cooldown × 2^(k−1)`, k being how many of its series closed in a row, capped at
 * `maxCooldown`. A series an operator closed is not ours to cool down; that is the operator's call.
 */
const withCooldown = ({
  classification,
  prior,
  cooldownMs,
  maxCooldownMs,
  now,
}: {
  classification: DetectionClassification;
  prior: PriorSeries | undefined;
  cooldownMs: number;
  maxCooldownMs: number;
  now: number;
}): DetectionClassification => {
  if (classification.reason !== 'not_live_member' || cooldownMs <= 0) return classification;
  if (!prior || prior.status !== 'inactive' || prior.statusSetBy === 'operator') {
    return classification;
  }
  const window = Math.min(cooldownMs * 2 ** (prior.consecutiveInactive - 1), maxCooldownMs);
  return now - Date.parse(prior.updatedAt) < window
    ? { decision: 'skip', reason: 'in_cooldown' }
    : classification;
};

/** A skip is only as good as the series it rests on: an old series or a joining rule withdraws it. */
const withEscalation = ({
  classification,
  memberships,
  maxSkipAgeMs,
  now,
  joiningEventIds,
}: {
  classification: DetectionClassification;
  memberships: readonly LiveRuleMembership[];
  maxSkipAgeMs: number;
  now: number;
  joiningEventIds: ReadonlySet<string>;
}): DetectionClassification => {
  if (classification.decision !== 'skip') return classification;
  const isTooOld = memberships.some(
    ({ createdAt }) => createdAt !== undefined && now - Date.parse(createdAt) > maxSkipAgeMs
  );
  if (isTooOld) return { decision: 'needs_agent', reason: 'series_too_old' };
  const isJoining = memberships.some(
    ({ eventId }) => eventId !== undefined && joiningEventIds.has(eventId)
  );
  return isJoining ? { decision: 'needs_agent', reason: 'member_joining' } : classification;
};

/** A rule needs a probe only when every one of its live series judged it. */
const needsProbe = (series: readonly LiveRuleMembership[]): boolean =>
  series.length > 0 && series.every(({ verdict }) => toMemberState(verdict) !== 'unjudged');

export interface ClassifyBatchParams {
  rows: readonly DetectionRow[];
  /** The names of the row columns; the `get_detections` ones when absent. */
  columns?: readonly string[];
  shadowMode: boolean;
  /** A skip is withdrawn when the series it rests on is older than this. */
  maxSkipAgeMs: number;
  /** The base cooldown after a rule's series closes; 0 turns it off. */
  cooldownMs: number;
  /** The most the cooldown grows to as the rule's series keep closing. */
  maxCooldownMs: number;
  /** The clock the series ages are read against. */
  now: number;
  probeConcurrency: number;
  findLiveMembers: (ruleUuids: string[]) => Promise<Map<string, LiveRuleMembership[]>>;
  /** Each rule's latest series in any status, for the agent to read; none when absent. */
  findPriorSeries?: (ruleUuids: string[]) => Promise<Map<string, PriorSeries>>;
  /** Re-runs a stored query once; must not throw. */
  probe: (query: string | undefined) => Promise<ProbeResult>;
  /** Is the detection above its own normal? Recorded in the decision, never acted on. */
  observe?: (query: string | undefined) => Promise<BaselineObservation | undefined>;
}

/**
 * Decides, per detection row, whether the discovery agent needs to see it. Every row is kept in
 * shadow mode; otherwise rows classified `skip` are dropped. Rows that cannot be parsed or fall
 * beyond `MAX_CLASSIFIED_ROWS` are always kept.
 */
export const classifyBatch = async ({
  rows,
  columns,
  shadowMode,
  maxSkipAgeMs,
  cooldownMs,
  maxCooldownMs,
  now,
  probeConcurrency,
  findLiveMembers,
  findPriorSeries,
  probe,
  observe,
}: ClassifyBatchParams): Promise<ClassifyDetectionsOutput> => {
  const parsed = rows.map((row, index) => ({
    index,
    row: parseDetectionRow(row),
    withinCap: index < MAX_CLASSIFIED_ROWS,
  }));
  const classifiable = parsed.flatMap(({ row, withinCap }) => (row && withinCap ? [row] : []));
  const ruleUuids = [...new Set(classifiable.map(({ ruleUuid }) => ruleUuid))];

  const memberships =
    ruleUuids.length > 0
      ? await findLiveMembers(ruleUuids)
      : new Map<string, LiveRuleMembership[]>();

  const priorSeries =
    findPriorSeries && ruleUuids.length > 0
      ? await findPriorSeries(ruleUuids)
      : new Map<string, PriorSeries>();
  const priorSeriesOf = (ruleUuid: string): BatchPriorSeries | undefined => {
    const series = priorSeries.get(ruleUuid);
    return series
      ? {
          ...(series.eventId ? { event_id: series.eventId } : {}),
          status: series.status,
          severity: series.severity,
          ...(series.assessmentNote ? { assessment_note: series.assessmentNote } : {}),
          updated_at: series.updatedAt,
          ...(series.status === 'inactive'
            ? {
                ended_by:
                  series.statusSetBy === 'operator' ? ('operator' as const) : ('engine' as const),
              }
            : {}),
        }
      : undefined;
  };

  const limiter = pLimit(probeConcurrency);
  const probes = new Map<string, ProbeResult>();
  const baselines = new Map<string, BaselineObservation>();
  await Promise.all(
    [...memberships.entries()]
      .filter(([, series]) => needsProbe(series))
      .map(([ruleUuid, series]) =>
        limiter(async () => {
          const storedQuery = series.find(({ esqlQuery }) => esqlQuery !== undefined)?.esqlQuery;
          const [probed, observed] = await Promise.all([
            probe(storedQuery),
            observe?.(storedQuery),
          ]);
          probes.set(ruleUuid, probed);
          if (observed) baselines.set(ruleUuid, observed);
        })
      )
  );

  const joiningEventIds = findJoinedSeries({
    detections: classifiable,
    memberships,
  });

  const decisions: Decision[] = [];
  const entries: BatchEntry[] = rows.map((row) =>
    toBatchEntry({
      columns,
      row,
      priorSeries: priorSeriesOf(parseDetectionRow(row)?.ruleUuid ?? ''),
    })
  );
  const skippedIndexes = new Set<number>();
  for (const { index, row, withinCap } of parsed) {
    if (!row) continue;
    const { ruleUuid, detectionId } = row;
    const probed = probes.get(ruleUuid);
    const baseline = baselines.get(ruleUuid);
    const series = memberships.get(ruleUuid) ?? [];
    const classification: DetectionClassification = withinCap
      ? withEscalation({
          classification: withCooldown({
            classification: classifyDetection({
              memberships: series,
              probe: probed ?? NOT_PROBED,
            }),
            prior: priorSeries.get(ruleUuid),
            cooldownMs,
            maxCooldownMs,
            now,
          }),
          memberships: series,
          maxSkipAgeMs,
          now,
          joiningEventIds,
        })
      : { decision: 'needs_agent', reason: 'over_cap' };
    if (classification.decision === 'skip') skippedIndexes.add(index);
    // While the classifier only records, the agent judges unprompted; hints are for enforcement.
    if (!shadowMode) {
      entries[index] = toBatchEntry({
        columns,
        row: rows[index],
        priorSeries: priorSeriesOf(ruleUuid),
        classifier: {
          reason: classification.reason,
          ...(probed ? { probe_status: probed.status } : {}),
          ...(baseline ? { baseline } : {}),
          live_events: (memberships.get(ruleUuid) ?? []).map((membership) => ({
            ...(membership.eventId ? { event_id: membership.eventId } : {}),
            status: membership.status,
            stored_verdict: membership.verdict,
          })),
        },
      });
    }
    decisions.push({
      rule_uuid: ruleUuid,
      ...(detectionId !== undefined ? { detection_id: detectionId } : {}),
      ...classification,
      ...(probed ? { probe_status: probed.status, probe_duration_ms: probed.durationMs } : {}),
      ...(baseline ? { baseline } : {}),
    });
  }

  const skippedRuleUuids = shadowMode
    ? []
    : [...new Set(decisions.filter(({ decision }) => decision === 'skip').map((d) => d.rule_uuid))];

  const agentRows = (shadowMode ? rows : rows.filter((_, i) => !skippedIndexes.has(i))).map(
    (row) => [...row]
  );

  return {
    rows: agentRows,
    batch: entries.filter((_, index) => shadowMode || !skippedIndexes.has(index)),
    row_count: agentRows.length,
    decisions,
    skipped_rule_uuids: skippedRuleUuids,
    skipped_count: skippedIndexes.size,
    needs_agent_count: decisions.length - skippedIndexes.size,
    reason_counts: countBy(decisions, ({ reason }) => reason),
    probe_status_counts: countBy(decisions, ({ probe_status: status }) => status),
    shadow_mode: shadowMode,
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
        shadow_mode: shadowMode,
        probe_window_minutes: windowMinutes,
        probe_timeout_ms: timeoutMs,
        probe_concurrency: probeConcurrency,
        budget_ms: budgetMs,
        max_skip_age_hours: maxSkipAgeHours,
        cooldown_hours: cooldownHours,
        max_cooldown_hours: maxCooldownHours,
      } = context.input;
      const esClient = context.contextManager.getScopedEsClient();
      const ruleEventsClient = new RuleEventsClient({ esClient, space: spaceId });

      const now = Date.now();
      const window = {
        from: new Date(now - windowMinutes * 60_000).toISOString(),
        to: new Date(now).toISOString(),
      };

      const run = (params: { query: string; tail: string; window: ProbeWindow }) =>
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
        shadowMode,
        maxSkipAgeMs: maxSkipAgeHours * 3_600_000,
        cooldownMs: cooldownHours * 3_600_000,
        maxCooldownMs: maxCooldownHours * 3_600_000,
        now,
        probeConcurrency,
        findLiveMembers: (ruleUuids) => ruleEventsClient.findLiveMembers({ ruleUuids }),
        findPriorSeries: (ruleUuids) =>
          ruleEventsClient.findPriorSeries({
            ruleUuids,
            from: new Date(now - PRIOR_SERIES_LOOKBACK_MS).toISOString(),
          }),
        probe: (query) =>
          runProbe({
            esClient,
            query,
            window,
            timeoutMs,
            deadlineAt: now + budgetMs,
            abortSignal: context.abortSignal,
          }),
        // Only while gathering evidence: it costs a second query per probed rule.
        observe: shadowMode ? (query) => observeMatchSeries({ query, now, run }) : undefined,
      });

      logger.info(
        `classifyDetections ${JSON.stringify({
          shadow_mode: output.shadow_mode,
          detections: output.decisions.length,
          skipped: output.skipped_count,
          needs_agent: output.needs_agent_count,
          reasons: output.reason_counts,
          probes: output.probe_status_counts,
        })}`
      );
      return { output };
    },
  });
