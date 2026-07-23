/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  CONTINUOUS_HUNT_WORKFLOW_ID,
  THREAT_INTEL_HUNT_FINDINGS_INDEX,
  THREAT_REPORTS_INDEX_PATTERN,
} from '../../../common/threat_intelligence/hub';
import type {
  HuntRunTerminalStatus,
  HuntStatusCurrentRun,
  HuntStatusCycle,
  HuntStatusLastRun,
  HuntStatusResponse,
  HuntStatusSchedule,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms } from '../lib/space_filter';

/**
 * Read-only status aggregation for the continuous-hunt workflow. Joins
 * three durable sources into the single envelope the Hub status strip
 * renders (`common/threat_intelligence/hub/hunt_status_types.ts`):
 *
 *   1. `.workflows-executions` / `.workflows-step-executions` — run
 *      history and in-flight step progress. These are workflows-plugin
 *      internal indices, so they're read with the internal user; the
 *      route itself is gated on the plugin's read privilege and only
 *      run *metadata* is surfaced (step ids, resolved request input
 *      `report_id` for the strip headline — never hunt step outputs).
 *   2. `.kibana-threat-intel-hunt-findings` — new-findings counts per
 *      cycle plus the 24h activity histogram (space filtered, current
 *      user).
 *   3. `feedback.last_hunted_at` stamps on threat reports — how many
 *      reports the last cycle actually swept, including re-hunts that
 *      produced no new findings.
 */

/** Statuses that mean an execution is still in flight. */
const IN_FLIGHT_STATUSES = new Set([
  'pending',
  'waiting',
  'waiting_for_input',
  'waiting_for_child',
  'running',
]);

const TERMINAL_STATUSES = new Set<HuntRunTerminalStatus>(['completed', 'failed', 'cancelled']);

const WORKFLOWS_EXECUTIONS_INDEX = '.workflows-executions';
const WORKFLOWS_STEP_EXECUTIONS_INDEX = '.workflows-step-executions';
const WORKFLOWS_WORKFLOWS_INDEX = '.workflows-workflows*';

/**
 * Findings are persisted by `hunt_orchestrator` moments after the
 * workflow steps report completion, and clock skew between the Kibana
 * process and ES timestamps is possible — pad the cycle window rather
 * than requiring exact containment.
 */
const CYCLE_WINDOW_PAD_BEFORE_MS = 60 * 1000;
const CYCLE_WINDOW_PAD_AFTER_MS = 2 * 60 * 1000;

const ACTIVITY_BUCKETS = 24;
const HOUR_MS = 60 * 60 * 1000;

export interface HuntStatusParams {
  spaceId: string;
  workflowId?: string;
}

interface ExecutionSource {
  id?: string;
  status?: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  triggeredBy?: string;
}

interface StepExecutionSource {
  stepId?: string;
  status?: string;
  startedAt?: string;
  stepExecutionIndex?: number;
  /**
   * Resolved step config. For `run_hunt_orchestrator` this is the
   * kibana.request payload: `{ body: { report_id, tier2_when }, ... }`.
   */
  input?: unknown;
  /** Present on completed elasticsearch.search steps (candidate load). */
  output?: unknown;
}

const ORCHESTRATOR_STEP_ID = 'run_hunt_orchestrator';
const LOAD_CANDIDATES_STEP_ID = 'load_hunt_candidates';

/** Exported for unit tests — pull report_id from a kibana.request step input. */
export const extractReportIdFromStepInput = (input: unknown): string | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }
  const body = (input as { body?: unknown }).body;
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const reportId = (body as { report_id?: unknown }).report_id;
  return typeof reportId === 'string' && reportId.trim() ? reportId.trim() : undefined;
};

/** Exported for unit tests — candidate batch size from load step output. */
export const extractReportsTotalFromLoadOutput = (output: unknown): number | undefined => {
  if (!output || typeof output !== 'object') {
    return undefined;
  }
  const hits = (output as { hits?: { hits?: unknown } }).hits?.hits;
  if (!Array.isArray(hits) || hits.length === 0) {
    return undefined;
  }
  return hits.length;
};

const pickCurrentOrchestratorStep = (
  steps: StepExecutionSource[]
): StepExecutionSource | undefined => {
  const orchestratorSteps = steps.filter((step) => step.stepId === ORCHESTRATOR_STEP_ID);
  if (orchestratorSteps.length === 0) {
    return undefined;
  }
  const running = [...orchestratorSteps].reverse().find((step) => step.status === 'running');
  return running ?? orchestratorSteps[orchestratorSteps.length - 1];
};

const loadReportTitle = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  reportId: string
): Promise<string | undefined> => {
  try {
    const response = await esClient.search({
      index: THREAT_REPORTS_INDEX_PATTERN,
      ignore_unavailable: true,
      size: 1,
      query: {
        bool: {
          filter: [buildSpaceFilterTerms(spaceId), { ids: { values: [reportId] } }],
        },
      },
      _source: ['content.title'],
    });
    const source = response.hits.hits[0]?._source as { content?: { title?: string } } | undefined;
    const title = source?.content?.title?.trim();
    return title || undefined;
  } catch {
    return undefined;
  }
};

/** Parse workflow trigger intervals like `"4h"`, `"30m"`, `"1d"`, `"90s"`. */
const parseIntervalMs = (every: string | undefined): number | undefined => {
  if (!every) return undefined;
  const match = /^(\d+)\s*([smhd])$/.exec(every.trim());
  if (!match) return undefined;
  const value = Number(match[1]);
  const unit = match[2];
  const unitMs: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * unitMs[unit];
};

const loadExecutions = async (
  internalClient: ElasticsearchClient,
  workflowId: string,
  spaceId: string
): Promise<ExecutionSource[]> => {
  const response = await internalClient.search({
    index: WORKFLOWS_EXECUTIONS_INDEX,
    ignore_unavailable: true,
    size: 10,
    sort: [{ startedAt: { order: 'desc' } }],
    query: {
      bool: {
        filter: [{ term: { workflowId } }, { term: { spaceId } }],
        // Test runs from the workflow editor shouldn't move the strip. The
        // field is unset on regular runs, so exclude explicit `true` only.
        must_not: [{ term: { isTestRun: true } }],
      },
    },
    _source: ['id', 'status', 'startedAt', 'finishedAt', 'duration', 'triggeredBy'],
  });
  return response.hits.hits
    .map((hit) => hit._source as ExecutionSource | undefined)
    .filter((source): source is ExecutionSource => source !== undefined);
};

const buildCurrentRun = async (
  esClient: ElasticsearchClient,
  internalClient: ElasticsearchClient,
  logger: Logger,
  spaceId: string,
  inFlight: ExecutionSource,
  lastCompletedRunId: string | undefined
): Promise<HuntStatusCurrentRun> => {
  const currentRun: HuntStatusCurrentRun = {
    id: inFlight.id ?? '',
    started_at: inFlight.startedAt ?? new Date(0).toISOString(),
    completed_steps: 0,
    reports_completed: 0,
  };
  try {
    const [stepsResponse, expectedResponse] = await Promise.all([
      internalClient.search({
        index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
        ignore_unavailable: true,
        size: 100,
        sort: [{ startedAt: { order: 'asc' } }],
        query: { term: { workflowRunId: currentRun.id } },
        // `input` / load-step `output` hits length are run metadata for the
        // strip (report id + batch size) — not hunt findings payloads.
        _source: ['stepId', 'status', 'startedAt', 'stepExecutionIndex', 'input', 'output'],
      }),
      lastCompletedRunId
        ? internalClient.count({
            index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
            ignore_unavailable: true,
            query: { term: { workflowRunId: lastCompletedRunId } },
          })
        : Promise.resolve(undefined),
    ]);
    const steps = stepsResponse.hits.hits
      .map((hit) => hit._source as StepExecutionSource | undefined)
      .filter((source): source is StepExecutionSource => source !== undefined);
    currentRun.completed_steps = steps.filter((step) =>
      TERMINAL_STATUSES.has(step.status as HuntRunTerminalStatus)
    ).length;
    const active = [...steps].reverse().find((step) => step.status === 'running');
    const currentStepId = active?.stepId ?? steps[steps.length - 1]?.stepId;
    if (currentStepId) currentRun.current_step_id = currentStepId;
    if (expectedResponse && expectedResponse.count > 0) {
      currentRun.expected_total_steps = expectedResponse.count;
    }

    const orchestratorSteps = steps.filter((step) => step.stepId === ORCHESTRATOR_STEP_ID);
    currentRun.reports_completed = orchestratorSteps.filter((step) =>
      TERMINAL_STATUSES.has(step.status as HuntRunTerminalStatus)
    ).length;

    const loadStep = [...steps]
      .reverse()
      .find((step) => step.stepId === LOAD_CANDIDATES_STEP_ID && step.output !== undefined);
    const reportsTotal = extractReportsTotalFromLoadOutput(loadStep?.output);
    if (typeof reportsTotal === 'number') {
      currentRun.reports_total = reportsTotal;
    } else if (orchestratorSteps.length > 0) {
      // Fallback before load output is available / indexed: at least as many
      // as we've already started.
      currentRun.reports_total = Math.max(
        orchestratorSteps.length,
        currentRun.reports_completed + (active?.stepId === ORCHESTRATOR_STEP_ID ? 1 : 0)
      );
    }

    const orchestratorStep = pickCurrentOrchestratorStep(steps);
    const reportId = extractReportIdFromStepInput(orchestratorStep?.input);
    if (reportId) {
      currentRun.current_report_id = reportId;
      const title = await loadReportTitle(esClient, spaceId, reportId);
      if (title) {
        currentRun.current_report_title = title;
      }
    }
    if (typeof orchestratorStep?.stepExecutionIndex === 'number') {
      currentRun.current_report_index = orchestratorStep.stepExecutionIndex + 1;
    } else if (orchestratorStep?.status === 'running') {
      currentRun.current_report_index = currentRun.reports_completed + 1;
    } else if (currentRun.reports_completed > 0) {
      currentRun.current_report_index = currentRun.reports_completed;
    }
  } catch (err) {
    // Step progress is a nice-to-have; the run header still renders.
    logger.debug(`hunt_status step progress lookup failed: ${(err as Error).message}`);
  }
  return currentRun;
};

const loadSchedule = async (
  internalClient: ElasticsearchClient,
  workflowId: string,
  executions: ExecutionSource[]
): Promise<HuntStatusSchedule> => {
  const schedule: HuntStatusSchedule = { every: null, armed: false, next_run_at: null };
  const response = await internalClient.search({
    index: WORKFLOWS_WORKFLOWS_INDEX,
    ignore_unavailable: true,
    size: 1,
    query: { ids: { values: [workflowId] } },
    _source: ['enabled', 'definition.triggers'],
  });
  const workflow = response.hits.hits[0]?._source as
    | {
        enabled?: boolean;
        definition?: { triggers?: Array<{ type?: string; with?: { every?: string } }> };
      }
    | undefined;
  const scheduledTrigger = workflow?.definition?.triggers?.find(
    (trigger) => trigger.type === 'scheduled'
  );
  schedule.every = scheduledTrigger?.with?.every ?? null;

  // "Armed" is evidence-based: the cron trigger only counts as live when a
  // scheduled execution actually fired within the last two intervals.
  // Locally (and on installs where the scheduled task registration failed)
  // the strip then renders an honest on-demand state instead of a
  // countdown that will never fire.
  const intervalMs = parseIntervalMs(schedule.every ?? undefined);
  if (!intervalMs || workflow?.enabled === false) return schedule;
  const lastScheduled = executions.find(
    (execution) => execution.triggeredBy === 'scheduled' && execution.startedAt
  );
  if (!lastScheduled?.startedAt) return schedule;
  const lastScheduledMs = Date.parse(lastScheduled.startedAt);
  if (Number.isNaN(lastScheduledMs) || Date.now() - lastScheduledMs > 2 * intervalMs) {
    return schedule;
  }
  schedule.armed = true;
  schedule.next_run_at = new Date(lastScheduledMs + intervalMs).toISOString();
  return schedule;
};

export const getHuntStatus = async (
  esClient: ElasticsearchClient,
  internalClient: ElasticsearchClient,
  logger: Logger,
  params: HuntStatusParams
): Promise<HuntStatusResponse> => {
  const workflowId = params.workflowId ?? CONTINUOUS_HUNT_WORKFLOW_ID;
  const response: HuntStatusResponse = {
    workflow_id: workflowId,
    workflow_found: false,
    current_run: null,
    last_run: null,
    cycle: null,
    totals: { findings: 0, reports_with_findings: 0 },
    activity_24h: new Array(ACTIVITY_BUCKETS).fill(0),
    schedule: { every: null, armed: false, next_run_at: null },
  };

  let executions: ExecutionSource[] = [];
  try {
    executions = await loadExecutions(internalClient, workflowId, params.spaceId);
  } catch (err) {
    logger.debug(`hunt_status executions lookup failed: ${(err as Error).message}`);
  }

  try {
    response.schedule = await loadSchedule(internalClient, workflowId, executions);
    response.workflow_found = response.schedule.every !== null || executions.length > 0;
  } catch (err) {
    logger.debug(`hunt_status schedule lookup failed: ${(err as Error).message}`);
    response.workflow_found = executions.length > 0;
  }

  const inFlight = executions.find(
    (execution) => execution.status && IN_FLIGHT_STATUSES.has(execution.status)
  );
  const lastTerminal = executions.find(
    (execution) =>
      execution.status && TERMINAL_STATUSES.has(execution.status as HuntRunTerminalStatus)
  );

  if (lastTerminal?.startedAt) {
    response.last_run = {
      id: lastTerminal.id ?? '',
      status: lastTerminal.status as HuntRunTerminalStatus,
      started_at: lastTerminal.startedAt,
      ...(lastTerminal.finishedAt ? { finished_at: lastTerminal.finishedAt } : {}),
      ...(typeof lastTerminal.duration === 'number' ? { duration_ms: lastTerminal.duration } : {}),
      ...(lastTerminal.triggeredBy ? { triggered_by: lastTerminal.triggeredBy } : {}),
    } satisfies HuntStatusLastRun;
  }

  if (inFlight) {
    response.current_run = await buildCurrentRun(
      esClient,
      internalClient,
      logger,
      params.spaceId,
      inFlight,
      lastTerminal?.status === 'completed' ? lastTerminal.id : undefined
    );
  }

  // Cycle window: last terminal run, padded for persistence lag / skew.
  const windowFrom = response.last_run
    ? Date.parse(response.last_run.started_at) - CYCLE_WINDOW_PAD_BEFORE_MS
    : undefined;
  const windowTo = response.last_run
    ? Date.parse(response.last_run.finished_at ?? response.last_run.started_at) +
      CYCLE_WINDOW_PAD_AFTER_MS
    : undefined;

  const nowMs = Date.now();
  const activityFromMs = nowMs - ACTIVITY_BUCKETS * HOUR_MS;

  try {
    const [findingsResponse, reportsHuntedResponse] = await Promise.all([
      esClient.search({
        index: THREAT_INTEL_HUNT_FINDINGS_INDEX,
        ignore_unavailable: true,
        size: 0,
        track_total_hits: true,
        query: { bool: { filter: [buildSpaceFilterTerms(params.spaceId)] } },
        aggs: {
          reports_with_findings: { cardinality: { field: 'report_id' } },
          activity: {
            filter: { range: { '@timestamp': { gte: activityFromMs, format: 'epoch_millis' } } },
            aggs: {
              per_hour: {
                date_histogram: {
                  field: '@timestamp',
                  fixed_interval: '1h',
                  min_doc_count: 0,
                  extended_bounds: { min: activityFromMs, max: nowMs },
                },
              },
            },
          },
          ...(windowFrom !== undefined && windowTo !== undefined
            ? {
                cycle: {
                  filter: {
                    range: {
                      '@timestamp': {
                        gte: windowFrom,
                        lte: windowTo,
                        format: 'epoch_millis',
                      },
                    },
                  },
                  aggs: {
                    env_hits: {
                      filter: { term: { tier1_status: 'environment_hits_found' } },
                    },
                  },
                },
              }
            : {}),
        },
      }),
      windowFrom !== undefined && windowTo !== undefined
        ? esClient.count({
            index: THREAT_REPORTS_INDEX_PATTERN,
            ignore_unavailable: true,
            query: {
              bool: {
                filter: [
                  buildSpaceFilterTerms(params.spaceId),
                  {
                    range: {
                      'feedback.last_hunted_at': {
                        gte: windowFrom,
                        lte: windowTo,
                        format: 'epoch_millis',
                      },
                    },
                  },
                ],
              },
            },
          })
        : Promise.resolve(undefined),
    ]);

    const totalRaw = findingsResponse.hits.total;
    response.totals.findings = typeof totalRaw === 'number' ? totalRaw : totalRaw?.value ?? 0;

    const aggs = findingsResponse.aggregations as
      | {
          reports_with_findings?: { value?: number };
          activity?: { per_hour?: { buckets?: Array<{ doc_count?: number }> } };
          cycle?: { doc_count?: number; env_hits?: { doc_count?: number } };
        }
      | undefined;
    response.totals.reports_with_findings = aggs?.reports_with_findings?.value ?? 0;

    const buckets = aggs?.activity?.per_hour?.buckets ?? [];
    // The histogram is hour-aligned so the window can span 25 buckets;
    // keep the trailing 24 and left-pad if the index is younger than a day.
    const counts = buckets.map((bucket) => bucket.doc_count ?? 0).slice(-ACTIVITY_BUCKETS);
    response.activity_24h = [
      ...new Array(Math.max(0, ACTIVITY_BUCKETS - counts.length)).fill(0),
      ...counts,
    ];

    if (response.last_run && aggs?.cycle) {
      response.cycle = {
        reports_hunted: reportsHuntedResponse?.count ?? 0,
        new_findings: aggs.cycle.doc_count ?? 0,
        environment_hits: aggs.cycle.env_hits?.doc_count ?? 0,
      } satisfies HuntStatusCycle;
    }
  } catch (err) {
    logger.debug(`hunt_status findings aggregation failed: ${(err as Error).message}`);
  }

  return response;
};
