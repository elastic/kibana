/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pLimit from 'p-limit';
import type { Logger } from '@kbn/core/server';
import {
  DECISION_REASONS,
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  PROBE_STATUSES,
  SKIP_REASONS,
  baselineObservationSchema,
  type SkipReason,
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
import { observeMatchSeries, type BaselineObservation } from './baseline';
import {
  batchEntrySchema,
  toBatchEntry,
  DEFAULT_DETECTION_COLUMNS,
  type BatchEntry,
} from './detection_batch';
import { runProbe, runStoredQuery, type ProbeResult, type ProbeWindow } from './run_probe';
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
  })
);

const baselineSchema = baselineObservationSchema;

const decisionSchema = lazySchema(() =>
  z.object({
    rule_uuid: z.string().max(MAX_ID_LENGTH),
    detection_id: z.string().max(MAX_ID_LENGTH).optional(),
    decision: z.enum(['skip', 'needs_agent']),
    reason: z.enum(DECISION_REASONS),
    probe_status: z.enum(PROBE_STATUSES).optional(),
    probe_duration_ms: z.number().int().min(0).optional(),
    /** What the old flaky-rule gate made of the detection; absent when the row does not say. */
    legacy_gate: z.enum(['suppressed', 'passed']).optional(),
    baseline: baselineSchema.optional(),
  })
);

/** The part of a decision a processed marker keeps: the marker route drops any other key. */
const skipMarkerSchema = lazySchema(() =>
  z.object({
    reason: z.enum(SKIP_REASONS),
    probe_status: z.enum(PROBE_STATUSES).optional(),
    probe_has_rows: z.boolean().optional(),
    probe_window_minutes: z.number().int().min(0).optional(),
    baseline: baselineSchema.optional(),
    event_id: z.string().max(MAX_ID_LENGTH).optional(),
    event_title: z.string().max(MAX_TITLE_LENGTH).optional(),
    stored_verdict: z.string().max(32).optional(),
  })
);

const countsSchema = lazySchema(() => z.record(z.string().max(64), z.number().int().min(0)));

const outputSchema = lazySchema(() =>
  z.object({
    /** The detections the agent reads, by field name: every one in shadow mode, only `needs_agent` ones otherwise. */
    batch: z.array(batchEntrySchema).max(MAX_INPUT_ROWS),
    decisions: z.array(decisionSchema).max(MAX_INPUT_ROWS),
    /** Rules whose detections are stamped processed; always empty in shadow mode. */
    skipped_rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
    /** Why each skipped rule was skipped, in the shape a processed marker stores; empty in shadow mode. */
    skips: z
      .array(z.object({ rule_uuid: z.string().max(MAX_ID_LENGTH), skip: skipMarkerSchema }))
      .max(MAX_INPUT_ROWS),
    /** Number of detections in `batch`; a numeric field so workflows can tell an empty batch from a missing output. */
    row_count: z.number().int().min(0),
    /** Decisions made, regardless of shadow mode. */
    skipped_count: z.number().int().min(0),
    needs_agent_count: z.number().int().min(0),
    reason_counts: countsSchema,
    probe_status_counts: countsSchema,
    /** Old gate against the classifier: `<suppressed|passed>:<skip|needs_agent>` to a count. */
    gate_counts: countsSchema,
    shadow_mode: z.boolean(),
    /**
     * The skipped detections the classifier judged. A rule's older unprocessed detections are
     * stamped with them; a newer one, which the classifier never saw, is not.
     */
    skipped_detection_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_INPUT_ROWS),
  })
);

export type ClassifyDetectionsOutput = z.infer<typeof outputSchema>;
type DetectionRow = readonly unknown[];
type Decision = z.infer<typeof decisionSchema>;
type SkipContext = Omit<z.infer<typeof skipMarkerSchema>, 'reason' | 'probe_status' | 'baseline'>;

const NOT_PROBED: ProbeOutcome = { status: 'no_query', hasRows: false };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseDetectionRow = (
  row: DetectionRow
):
  | {
      ruleUuid: string;
      detectionId: string | undefined;
      sourceId: string | undefined;
    }
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
  const isJoining = memberships.some(
    ({ eventId }) => eventId !== undefined && joiningEventIds.has(eventId)
  );
  return isJoining ? { decision: 'needs_agent', reason: 'member_joining' } : classification;
};

const isSkipReason = (reason: string): reason is SkipReason =>
  (SKIP_REASONS as readonly string[]).includes(reason);

const LEGACY_GATE_COLUMN = 'flaky_suppressed';

/** Did the old flaky-rule gate hold this row back? Undefined when the row does not carry it. */
const readLegacyGate = ({
  columns = DEFAULT_DETECTION_COLUMNS,
  row,
}: {
  columns?: readonly string[];
  row: DetectionRow;
}): 'suppressed' | 'passed' | undefined => {
  const cell = row[columns.indexOf(LEGACY_GATE_COLUMN)];
  if (typeof cell !== 'boolean') return undefined;
  return cell ? 'suppressed' : 'passed';
};

/** A rule needs a probe only when every one of its live series judged it. */
const needsProbe = (series: readonly LiveRuleMembership[]): boolean =>
  series.length > 0 && series.every(({ verdict }) => toMemberState(verdict) !== 'unjudged');

export interface ClassifyBatchParams {
  rows: readonly DetectionRow[];
  /** The names of the row columns; the `get_detections` ones when absent. */
  columns?: readonly string[];
  shadowMode: boolean;
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
  now,
  probeWindowMinutes,
  probeConcurrency,
  findLiveMemberships,
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
      ? await findLiveMemberships(ruleUuids)
      : new Map<string, LiveRuleMembership[]>();

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
  const entries: BatchEntry[] = rows.map((row, index) => {
    return toBatchEntry({
      columns,
      row,
      includeFlakyProbe: shadowMode,
    });
  });
  const skippedIndexes = new Set<number>();
  // What a skip saw, by rule, so the marker can say why.
  const skipContext = new Map<string, SkipContext>();
  // While the classifier only records, the old flaky-rule gate still keeps its rows from the agent.
  const heldBackIndexes = new Set<number>();
  for (const { index, row, withinCap } of parsed) {
    if (!row) continue;
    const { ruleUuid, detectionId } = row;
    const probed = probes.get(ruleUuid);
    const baseline = baselines.get(ruleUuid);
    const series = memberships.get(ruleUuid) ?? [];
    const classification: DetectionClassification = withinCap
      ? withEscalation({
          classification: classifyDetection({
            memberships: series,
            probe: probed ?? NOT_PROBED,
          }),
          memberships: series,
          maxSkipAgeMs,
          now,
          joiningEventIds,
          baseline,
        })
      : { decision: 'needs_agent', reason: 'over_cap' };
    if (classification.decision === 'skip') {
      skippedIndexes.add(index);
      const member = series[0];
      skipContext.set(ruleUuid, {
        ...(probed?.status === 'ok'
          ? { probe_has_rows: probed.hasRows, probe_window_minutes: probeWindowMinutes }
          : {}),
        ...(member?.eventId ? { event_id: member.eventId } : {}),
        ...(member?.eventTitle ? { event_title: member.eventTitle } : {}),
        ...(member ? { stored_verdict: member.verdict } : {}),
      });
    }
    const legacyGate = readLegacyGate({ columns, row: rows[index] });
    if (shadowMode && legacyGate === 'suppressed') heldBackIndexes.add(index);
    // While the classifier only records, the agent judges unprompted; hints are for enforcement.
    // A skipped row is dropped from the batch, so only the rows the agent reads get one.
    if (!shadowMode && classification.decision === 'needs_agent') {
      entries[index] = toBatchEntry({
        columns,
        row: rows[index],
        // The classifier replaced the count-based gate the flag belonged to.
        includeFlakyProbe: false,
        classifier: {
          reason: classification.reason,
          ...(probed ? { probe_status: probed.status } : {}),
          ...(probed?.status === 'ok' ? { probe_has_rows: probed.hasRows } : {}),
          ...(baseline ? { baseline } : {}),
          live_events: (memberships.get(ruleUuid) ?? []).map((membership) => ({
            ...(membership.eventId ? { event_id: membership.eventId } : {}),
            status: membership.status,
            stored_verdict: membership.verdict,
            ...(membership.verdict === 'refutes'
              ? { evidence_found: membership.evidenceFound }
              : {}),
          })),
        },
      });
    }
    decisions.push({
      rule_uuid: ruleUuid,
      ...(detectionId !== undefined ? { detection_id: detectionId } : {}),
      ...classification,
      ...(legacyGate ? { legacy_gate: legacyGate } : {}),
      ...(probed ? { probe_status: probed.status, probe_duration_ms: probed.durationMs } : {}),
      ...(baseline ? { baseline } : {}),
    });
  }

  const stamped = shadowMode ? [] : decisions.filter(({ decision }) => decision === 'skip');
  const skippedRuleUuids = [...new Set(stamped.map(({ rule_uuid: ruleUuid }) => ruleUuid))];

  const reachesAgent = (index: number): boolean =>
    !heldBackIndexes.has(index) && (shadowMode || !skippedIndexes.has(index));

  const skips = stamped.flatMap(
    ({ rule_uuid: ruleUuid, reason, probe_status: probeStatus, baseline }) =>
      isSkipReason(reason)
        ? [
            {
              rule_uuid: ruleUuid,
              skip: {
                reason,
                ...(probeStatus ? { probe_status: probeStatus } : {}),
                ...(baseline ? { baseline } : {}),
                ...skipContext.get(ruleUuid),
              },
            },
          ]
        : []
  );

  const batch = entries.filter((_, index) => reachesAgent(index));
  return {
    batch,
    row_count: batch.length,
    decisions,
    skipped_rule_uuids: skippedRuleUuids,
    skips,
    skipped_count: skippedIndexes.size,
    needs_agent_count: decisions.length - skippedIndexes.size,
    reason_counts: countBy(decisions, ({ reason }) => reason),
    probe_status_counts: countBy(decisions, ({ probe_status: status }) => status),
    gate_counts: countBy(
      decisions.filter(({ legacy_gate: gate }) => gate !== undefined),
      ({ legacy_gate: gate, decision }) => `${gate}:${decision}`
    ),
    shadow_mode: shadowMode,
    skipped_detection_ids: stamped.flatMap(({ detection_id: id }) => (id ? [id] : [])),
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
        now,
        probeWindowMinutes: windowMinutes,
        probeConcurrency,
        // A live series with no write for longer than the skip age cannot rest a skip anyway.
        findLiveMemberships: (ruleUuids) =>
          ruleEventsClient.findLiveMemberships({
            ruleUuids,
            from: new Date(now - maxSkipAgeHours * 3_600_000).toISOString(),
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
        // Both modes, so shadow decisions predict enforcement: it costs a second query per probed rule.
        observe: (query) => observeMatchSeries({ query, now, run }),
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
