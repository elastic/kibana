/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  ExecutionStatus,
  NonTerminalExecutionStatuses,
  TerminalExecutionStatuses,
  isInProgressStatus,
  type WorkflowExecutionDto,
} from '@kbn/workflows';
import {
  THREAT_INTEL_HUNT_FINDINGS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
  type ContinuousHuntStatusResponse,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms } from '../lib/space_filter';
import {
  CONTINUOUS_THREAT_HUNT_INTERVAL_MS,
  CONTINUOUS_THREAT_HUNT_SCHEDULED_TASK_ID,
  CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
  CONTINUOUS_THREAT_HUNT_WORKFLOW_SPACE_ID,
} from '../workflows';

const LOAD_CANDIDATES_STEP_ID = 'load_hunt_candidates';
const RUN_ORCHESTRATOR_STEP_ID = 'run_hunt_orchestrator';
const SPARKLINE_BUCKETS = 24;
const FINDINGS_FETCH_SIZE = 500;

export interface ContinuousHuntStatusParams {
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  workflowsManagement?: WorkflowsServerPluginSetup;
  taskManager?: TaskManagerStartContract;
  now?: Date;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * Pull `report_id` from a kibana.request step input/output. Shape varies by
 * engine version (nested `body`, top-level fields, or HTTP response wrapper).
 */
export const extractReportIdFromStepPayload = (payload: unknown): string | undefined => {
  if (!isRecord(payload)) {
    return undefined;
  }
  const direct = asString(payload.report_id);
  if (direct) {
    return direct;
  }
  if (isRecord(payload.body)) {
    const fromBody = asString(payload.body.report_id);
    if (fromBody) {
      return fromBody;
    }
  }
  if (isRecord(payload.output) && isRecord(payload.output.body)) {
    return asString(payload.output.body.report_id);
  }
  return undefined;
};

export const extractCandidateTotal = (stepOutput: unknown): number => {
  if (!isRecord(stepOutput)) {
    return 0;
  }
  const hits = isRecord(stepOutput.hits) ? stepOutput.hits : undefined;
  const hitList = hits && Array.isArray(hits.hits) ? hits.hits : undefined;
  if (hitList) {
    return hitList.length;
  }
  const total = hits?.total;
  if (typeof total === 'number') {
    return total;
  }
  if (isRecord(total) && typeof total.value === 'number') {
    return total.value;
  }
  return 0;
};

export const extractOrchestratorStatusLabel = (stepOutput: unknown): string | undefined => {
  if (!isRecord(stepOutput)) {
    return undefined;
  }
  const body = isRecord(stepOutput.body) ? stepOutput.body : stepOutput;
  const status = asString(body.status);
  if (!status) {
    return undefined;
  }
  return `Orchestrator status: ${status}`;
};

const emptySparkline = (): number[] => Array.from({ length: SPARKLINE_BUCKETS }, () => 0);

export const countSuppressedFindings = (
  rows: Array<{ report_id: string; technique_id: string }>
): { suppressedCount: number; distinctReports: number } => {
  const groups = new Map<string, number>();
  const reportIds = new Set<string>();

  for (const row of rows) {
    if (row.report_id) {
      reportIds.add(row.report_id);
    }
    const key = `${row.report_id}:${row.technique_id}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }

  let suppressedCount = 0;
  for (const size of groups.values()) {
    if (size > 1) {
      suppressedCount += size - 1;
    }
  }

  return { suppressedCount, distinctReports: reportIds.size };
};

/**
 * Prefer the title already present on `load_hunt_candidates` hits so we do
 * not need a second ES round-trip when the step output includes `_source`.
 */
export const extractTitleFromCandidateHits = (
  stepOutput: unknown,
  reportId: string
): string | undefined => {
  if (!isRecord(stepOutput) || !reportId) {
    return undefined;
  }
  const hits = isRecord(stepOutput.hits) ? stepOutput.hits : undefined;
  const hitList = hits && Array.isArray(hits.hits) ? hits.hits : undefined;
  if (!hitList) {
    return undefined;
  }
  for (const hit of hitList) {
    if (isRecord(hit) && hit._id === reportId) {
      const source = isRecord(hit._source) ? hit._source : undefined;
      const content = source && isRecord(source.content) ? source.content : undefined;
      const title = content ? asString(content.title) : undefined;
      if (title) {
        return title;
      }
    }
  }
  return undefined;
};

const resolveReportProgress = (
  execution: WorkflowExecutionDto
): {
  reportId?: string;
  titleFromCandidates?: string;
  index: number;
  total: number;
  orchestratorRunning: boolean;
  lastCompletedOutput?: unknown;
} => {
  const steps = execution.stepExecutions ?? [];
  const loadStep = steps.find((s) => s.stepId === LOAD_CANDIDATES_STEP_ID);
  const total = Math.min(10, extractCandidateTotal(loadStep?.output) || 0);

  const orchestratorSteps = steps.filter((s) => s.stepId === RUN_ORCHESTRATOR_STEP_ID);
  const completed = orchestratorSteps.filter((s) => TerminalExecutionStatuses.includes(s.status));
  const running = orchestratorSteps.find((s) => isInProgressStatus(s.status));

  let reportId: string | undefined;
  let lastCompletedOutput: unknown;
  if (running) {
    reportId = extractReportIdFromStepPayload(running.input);
  } else if (completed.length > 0) {
    const last = completed[completed.length - 1];
    reportId =
      extractReportIdFromStepPayload(last.output) ?? extractReportIdFromStepPayload(last.input);
    lastCompletedOutput = last.output;
  }

  const index = Math.min(
    total || completed.length + (running ? 1 : 0),
    Math.max(1, completed.length + (running ? 1 : 0))
  );

  return {
    reportId,
    titleFromCandidates: reportId
      ? extractTitleFromCandidateHits(loadStep?.output, reportId)
      : undefined,
    index: total === 0 && !running && completed.length === 0 ? 0 : index,
    total: total || Math.max(completed.length + (running ? 1 : 0), 0),
    orchestratorRunning: Boolean(running),
    lastCompletedOutput,
  };
};

/**
 * Resolve a report title via `ids` search. `esClient.get` cannot target the
 * `.kibana-threat-reports*` data-stream wildcard, which is why hunting was
 * falling back to the raw report id.
 */
export const loadReportTitle = async (
  esClient: ElasticsearchClient,
  reportId: string
): Promise<string | undefined> => {
  if (!reportId) {
    return undefined;
  }
  try {
    const response = await esClient.search<{ content?: { title?: string } }>({
      index: THREAT_REPORTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 1,
      query: {
        ids: { values: [reportId] },
      },
      _source: ['content.title'],
    });
    const hit = response.hits.hits[0];
    const title = hit?._source?.content?.title;
    return typeof title === 'string' && title.length > 0 ? title : undefined;
  } catch {
    return undefined;
  }
};

interface FindingsAggResult {
  newCount: number;
  suppressedCount: number;
  distinctReports: number;
  sparkline: number[];
}

const loadFindingsSummary = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  cycleFromIso: string,
  nowIso: string
): Promise<FindingsAggResult> => {
  const spaceFilter = buildSpaceFilterTerms(spaceId);
  const search = await esClient.search<{
    report_id?: string;
    technique_id?: string;
    status?: string;
  }>({
    index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
    size: FINDINGS_FETCH_SIZE,
    track_total_hits: false,
    query: {
      bool: {
        filter: [
          spaceFilter,
          {
            range: {
              '@timestamp': {
                gte: cycleFromIso,
                lte: nowIso,
              },
            },
          },
        ],
      },
    },
    _source: ['report_id', 'technique_id', 'status'],
    aggs: {
      activity_24h: {
        date_histogram: {
          field: '@timestamp',
          fixed_interval: '1h',
          min_doc_count: 0,
          extended_bounds: {
            min: new Date(Date.parse(nowIso) - SPARKLINE_BUCKETS * 60 * 60 * 1000).toISOString(),
            max: nowIso,
          },
        },
      },
    },
  });

  const rows = (search.hits.hits ?? []).map((hit) => ({
    report_id: hit._source?.report_id ?? '',
    technique_id: hit._source?.technique_id ?? '',
    status: hit._source?.status ?? '',
  }));

  const newRows = rows.filter((r) => r.status === 'new');
  const { suppressedCount, distinctReports } = countSuppressedFindings(rows);
  // Suppressed among new findings only (matches Hub table mental model).
  const { suppressedCount: newSuppressed } = countSuppressedFindings(newRows);

  const buckets =
    (search.aggregations?.activity_24h as { buckets?: Array<{ doc_count: number }> } | undefined)
      ?.buckets ?? [];
  const sparkline = emptySparkline();
  const slice = buckets.slice(-SPARKLINE_BUCKETS);
  for (let i = 0; i < slice.length; i++) {
    sparkline[SPARKLINE_BUCKETS - slice.length + i] = slice[i]?.doc_count ?? 0;
  }

  return {
    newCount: newRows.length,
    suppressedCount: newSuppressed > 0 ? newSuppressed : suppressedCount,
    distinctReports,
    sparkline,
  };
};

const resolveNextRunAt = async (
  taskManager: TaskManagerStartContract | undefined,
  lastCompletedAt: string | undefined,
  now: Date,
  logger: Logger
): Promise<string | undefined> => {
  if (taskManager) {
    try {
      const task = await taskManager.get(CONTINUOUS_THREAT_HUNT_SCHEDULED_TASK_ID);
      const runAt = (task as { runAt?: Date | string }).runAt;
      if (runAt instanceof Date) {
        return runAt.toISOString();
      }
      if (typeof runAt === 'string' && runAt.length > 0) {
        return runAt;
      }
    } catch (err) {
      logger.debug(
        `continuous_hunt_status: scheduled task lookup failed: ${(err as Error).message}`
      );
    }
  }
  if (lastCompletedAt) {
    const next = Date.parse(lastCompletedAt) + CONTINUOUS_THREAT_HUNT_INTERVAL_MS;
    if (Number.isFinite(next)) {
      return new Date(Math.max(next, now.getTime())).toISOString();
    }
  }
  return undefined;
};

const buildTier = (
  orchestratorRunning: boolean,
  lastCompletedOutput: unknown
): ContinuousHuntStatusResponse['tier'] => {
  if (orchestratorRunning) {
    return {
      current: 1,
      total: 2,
      label: 'Running Tier 1 and Tier 2…',
    };
  }
  const fromOutput = extractOrchestratorStatusLabel(lastCompletedOutput);
  return {
    current: 2,
    total: 2,
    label: fromOutput ?? 'Tier 1 and Tier 2 complete',
  };
};

/**
 * Aggregate continuous hunt workflow execution + durable findings for the Hub strip.
 */
export const getContinuousHuntStatus = async (
  params: ContinuousHuntStatusParams
): Promise<ContinuousHuntStatusResponse> => {
  const now = params.now ?? new Date();
  const nowIso = now.toISOString();
  const management = params.workflowsManagement?.management;

  let workflowEnabled = false;
  let phase: ContinuousHuntStatusResponse['phase'] = 'idle';
  let workflowExecutionId: string | undefined;
  let startedAt: string | undefined;
  let lastCompletedAt: string | undefined;
  let report: ContinuousHuntStatusResponse['report'];
  let tier: ContinuousHuntStatusResponse['tier'];

  if (management) {
    try {
      const workflow = await management.getWorkflow(
        CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
        CONTINUOUS_THREAT_HUNT_WORKFLOW_SPACE_ID
      );
      workflowEnabled = Boolean(workflow?.enabled);
    } catch (err) {
      params.logger.debug(`continuous_hunt_status: getWorkflow failed: ${(err as Error).message}`);
    }

    try {
      const active = await management.getWorkflowExecutions(
        {
          workflowId: CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
          statuses: [...NonTerminalExecutionStatuses],
          sortField: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          size: 1,
          omitStepRuns: true,
        },
        CONTINUOUS_THREAT_HUNT_WORKFLOW_SPACE_ID
      );

      const activeItem = active.results[0];
      if (activeItem && isInProgressStatus(activeItem.status)) {
        phase = 'hunting';
        workflowExecutionId = activeItem.id;
        startedAt = activeItem.startedAt;

        const full = await management.getWorkflowExecution(
          activeItem.id,
          CONTINUOUS_THREAT_HUNT_WORKFLOW_SPACE_ID,
          { includeInput: true, includeOutput: true }
        );

        if (full) {
          const progress = resolveReportProgress(full);
          let title = progress.titleFromCandidates;
          if (!title && progress.reportId) {
            title = await loadReportTitle(params.esClient, progress.reportId);
          }
          if (progress.reportId && progress.total > 0) {
            report = {
              id: progress.reportId,
              title,
              index: Math.max(1, progress.index),
              total: progress.total,
            };
          }
          tier = buildTier(progress.orchestratorRunning, progress.lastCompletedOutput);
        }
      }
    } catch (err) {
      params.logger.warn(
        `continuous_hunt_status: active execution lookup failed: ${(err as Error).message}`
      );
    }

    try {
      const completed = await management.getWorkflowExecutions(
        {
          workflowId: CONTINUOUS_THREAT_HUNT_WORKFLOW_ID,
          statuses: [ExecutionStatus.COMPLETED],
          sortField: 'finishedAt',
          sortOrder: 'desc',
          page: 1,
          size: 1,
          omitStepRuns: true,
        },
        CONTINUOUS_THREAT_HUNT_WORKFLOW_SPACE_ID
      );
      const last = completed.results[0];
      if (last?.finishedAt) {
        lastCompletedAt = last.finishedAt;
      }
    } catch (err) {
      params.logger.debug(
        `continuous_hunt_status: last completed lookup failed: ${(err as Error).message}`
      );
    }
  }

  const cycleFromMs = startedAt
    ? Date.parse(startedAt)
    : now.getTime() - CONTINUOUS_THREAT_HUNT_INTERVAL_MS;
  const cycleFromIso = new Date(
    Number.isFinite(cycleFromMs) ? cycleFromMs : now.getTime() - CONTINUOUS_THREAT_HUNT_INTERVAL_MS
  ).toISOString();

  let findingsSummary: FindingsAggResult = {
    newCount: 0,
    suppressedCount: 0,
    distinctReports: 0,
    sparkline: emptySparkline(),
  };
  try {
    findingsSummary = await loadFindingsSummary(
      params.esClient,
      params.spaceId,
      cycleFromIso,
      nowIso
    );
  } catch (err) {
    params.logger.warn(
      `continuous_hunt_status: findings summary failed: ${(err as Error).message}`
    );
  }

  // Sparkline is always last 24h, not just the cycle window.
  try {
    const sparkFrom = new Date(now.getTime() - SPARKLINE_BUCKETS * 60 * 60 * 1000).toISOString();
    const sparkSearch = await params.esClient.search({
      index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            buildSpaceFilterTerms(params.spaceId),
            { range: { '@timestamp': { gte: sparkFrom, lte: nowIso } } },
          ],
        },
      },
      aggs: {
        activity_24h: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: '1h',
            min_doc_count: 0,
            extended_bounds: { min: sparkFrom, max: nowIso },
          },
        },
      },
    });
    const buckets =
      (
        sparkSearch.aggregations?.activity_24h as
          | { buckets?: Array<{ doc_count: number }> }
          | undefined
      )?.buckets ?? [];
    const sparkline = emptySparkline();
    const slice = buckets.slice(-SPARKLINE_BUCKETS);
    for (let i = 0; i < slice.length; i++) {
      sparkline[SPARKLINE_BUCKETS - slice.length + i] = slice[i]?.doc_count ?? 0;
    }
    findingsSummary = { ...findingsSummary, sparkline };
  } catch {
    // Keep cycle sparkline fallback from loadFindingsSummary.
  }

  const nextRunAt = await resolveNextRunAt(params.taskManager, lastCompletedAt, now, params.logger);

  const reportsHunted =
    phase === 'hunting' && report
      ? Math.max(report.index, findingsSummary.distinctReports)
      : findingsSummary.distinctReports;

  return {
    phase,
    workflow_enabled: workflowEnabled,
    ...(workflowExecutionId ? { workflow_execution_id: workflowExecutionId } : {}),
    ...(startedAt ? { started_at: startedAt } : {}),
    ...(lastCompletedAt ? { last_completed_at: lastCompletedAt } : {}),
    ...(nextRunAt ? { next_run_at: nextRunAt } : {}),
    reports_hunted_last_cycle: reportsHunted,
    ...(report ? { report } : {}),
    ...(tier && phase === 'hunting' ? { tier } : {}),
    findings: {
      new_count: findingsSummary.newCount,
      suppressed_count: findingsSummary.suppressedCount,
    },
    sparkline_24h: findingsSummary.sparkline,
  };
};
