/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import { TerminalExecutionStatuses } from '@kbn/workflows';
import type { CoordinatorRun } from '../types';
import { nestDottedKeys } from './nest_document';
import { isCoordinatorResult, wireToCoordinatorRun } from './wire_adapter';

const WORKFLOWS_API_VERSION = '2023-10-31';
const ALERTZERO_API_VERSION = '1';

/** The index the ingest route writes to (security_solution threat_intel constants). */
const THREAT_REPORTS_INDEX = '.kibana-threat-reports';

const INGEST_THREAT_REPORT_URL = '/internal/threat_intel/ingest_threat_report';
const HUNT_EXECUTE_WORKFLOW_ID = 'system-security-hunt-execute';
const CANDIDATES_URL = '/internal/alertzero/hunt/candidates';
const REPORT_IDS_CAP = 10; // candidates_route.gen.ts: report_ids max 10
// The coordinator run is async (hunt.yaml): `run_hunt_coordinator` returns only
// a run envelope and the body arrives via this step's completed attachment read.
const READ_HUNT_RESULT_STEP_ID = 'read_hunt_result';

export interface HuntWatchClientOptions {
  huntWorkerWorkflowId: string;
  /**
   * Used to `_refresh` the reports index before each candidates call: the
   * ingest route is a plain `op_type: create` index op and never refreshes,
   * so a fresh id can otherwise come back `not_found`.
   */
  esClient: ReportsIndexRefresher;
  /** Sweep poll bounds; one sweep runs up to 14 hunts with model calls. */
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

export interface IngestedReport {
  reportId: string;
}

export interface CandidatesResponse {
  ids: string[];
  skipped: Array<{ id: string; reason: string }>;
}

/**
 * The per-batch candidates control (design v6 §4a): `ids` must equal the
 * requested batch as a SET — same length, no duplicates, no foreign ids. A
 * same-length response with a duplicate or a foreign id is a violation even
 * though the counts match.
 */
export const candidatesMatchBatch = (
  batch: readonly string[],
  response: Pick<CandidatesResponse, 'ids' | 'skipped'>
): boolean => {
  if (response.skipped.length > 0) return false;
  if (response.ids.length !== batch.length) return false;
  const wanted = new Set(batch);
  const seen = new Set<string>();
  for (const id of response.ids) {
    if (!wanted.has(id) || seen.has(id)) return false;
    seen.add(id);
  }
  return true;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

// The engine's own terminal set (completed/failed/cancelled/skipped/timed_out).
// A hand-written list drifted from it once and made every sweep wait out its deadline.
const TERMINAL_STATUSES = new Set<string>(TerminalExecutionStatuses);

export const isTerminal = (status: string | undefined): boolean =>
  status !== undefined && TERMINAL_STATUSES.has(status);

/**
 * The coordinator body from the hunt child's poll loop. `read_hunt_result`
 * runs once per iteration and only the `completed` read carries `data.result`;
 * a `failed` read carries `data.error` instead, and a run that never finished
 * has no completed read at all — both yield `undefined`, same as a coordinator
 * that was never started.
 */
export const readHuntResultOutput = (steps: readonly unknown[]): unknown => {
  for (const step of steps) {
    if (isRecord(step) && step.stepId === READ_HUNT_RESULT_STEP_ID) {
      const output = isRecord(step.output) ? step.output : undefined;
      const data = output !== undefined && isRecord(output.data) ? output.data : undefined;
      if (data !== undefined && data.state === 'completed' && isRecord(data.result)) {
        return data.result;
      }
    }
  }
  return undefined;
};

/** The one ES call the client makes: an explicit refresh of the reports index. */
export interface ReportsIndexRefresher {
  indices: { refresh: (params: { index: string }) => Promise<unknown> };
}

/**
 * Drives the Hunt Watch SUT over production HTTP routes (design v1 §4, v6
 * §4a): report ingest through `/internal/threat_intel/ingest_threat_report`
 * (ES mints the id; `op_type: create`), the candidates route for the
 * per-batch selection assertion, and the Worker manual trigger with
 * `reportIds`, polling the sweep to a terminal status and reading each hunt's
 * coordinator body via readHuntResultOutput of the
 * `system-security-hunt-execute` child execution (never the execution-level
 * output — the context.output trap).
 */
export class HuntWatchClient {
  constructor(
    private readonly kbnClient: KbnClient,
    private readonly log: ToolingLog,
    private readonly options: HuntWatchClientOptions
  ) {}

  /** Ingests one report through the production route; ES mints the id. */
  async ingestThreatReport(document: Record<string, unknown>): Promise<IngestedReport> {
    const response = await this.kbnClient.request<{ reportId: string }>({
      path: INGEST_THREAT_REPORT_URL,
      method: 'POST',
      headers: {
        'elastic-api-version': ALERTZERO_API_VERSION,
        'x-elastic-internal-origin': 'Kibana',
        'kbn-xsrf': 'true',
      },
      body: { document: nestDottedKeys(document) },
    });
    return { reportId: response.data.reportId };
  }

  /**
   * `POST /internal/alertzero/hunt/candidates` with named `report_ids`, after
   * an explicit `_refresh` of the reports index (the ingest route never
   * refreshes). Per design v6 §4a the caller asserts `ids` equals the batch
   * and `skipped` is empty; this returns the raw response so the assertion
   * lives in the harness where its failure names the INVALID reason.
   */
  async selectCandidates(reportIds: string[]): Promise<CandidatesResponse> {
    await this.options.esClient.indices.refresh({ index: THREAT_REPORTS_INDEX });
    const response = await this.kbnClient.request<{
      ids: string[];
      skipped: Array<{ id: string; reason: string }>;
    }>({
      path: CANDIDATES_URL,
      method: 'POST',
      headers: {
        'elastic-api-version': ALERTZERO_API_VERSION,
        'x-elastic-internal-origin': 'Kibana',
        'kbn-xsrf': 'true',
      },
      body: { report_ids: reportIds, limit: REPORT_IDS_CAP },
    });
    return response.data;
  }

  /**
   * Triggers the Hunt Worker manually with `reportIds` (batches of 10, the
   * route cap), polls each sweep to a terminal status, and returns the
   * coordinator output per report id, read from the read_hunt_result step
   * output of the child executions (the coordinator run itself is async). A
   * per-batch candidates violation is
   * surfaced as `invalidBatches` — it is an INVALID cell, never a skip.
   */
  async runHunts(
    reportIds: string[],
    {
      onCandidates,
    }: { onCandidates?: (batch: string[], response: CandidatesResponse) => void } = {}
  ): Promise<{
    runs: Map<string, CoordinatorRun>;
    invalidBatches: Array<{ batch: string[]; response: CandidatesResponse }>;
  }> {
    const runs = new Map<string, CoordinatorRun>();
    const invalidBatches: Array<{ batch: string[]; response: CandidatesResponse }> = [];

    // Serialized: the Worker's concurrency is `strategy: drop, max: 1`, so a
    // second sweep while one runs is silently dropped, not queued.
    for (let i = 0; i < reportIds.length; i += REPORT_IDS_CAP) {
      const batch = reportIds.slice(i, i + REPORT_IDS_CAP);
      const candidates = await this.selectCandidates(batch);
      onCandidates?.(batch, candidates);
      const perBatchOk = candidatesMatchBatch(batch, candidates);
      if (perBatchOk) {
        const sweep = await this.triggerSweep(batch);
        const sweepRuns = await this.readSweepCoordinatorOutputs(sweep.executionId);
        for (const [reportId, run] of sweepRuns) runs.set(reportId, run);
      } else {
        invalidBatches.push({ batch, response: candidates });
      }
    }

    return { runs, invalidBatches };
  }

  /** Manual Worker trigger with reportIds: the bypass path (design v1 §4). */
  private async triggerSweep(reportIds: string[]): Promise<{ executionId: string }> {
    const response = await this.kbnClient.request<{ workflowExecutionId: string }>({
      path: `/api/workflows/workflow/${encodeURIComponent(this.options.huntWorkerWorkflowId)}/run`,
      method: 'POST',
      headers: {
        'elastic-api-version': WORKFLOWS_API_VERSION,
        'kbn-xsrf': 'true',
      },
      body: { inputs: { reportIds } },
    });
    const executionId = response.data.workflowExecutionId;
    this.log.info(`[hunt-watch] Worker sweep ${executionId} over ${reportIds.length} reports`);
    return { executionId };
  }

  /**
   * Polls one sweep to a terminal status (runs are hunts, minutes each).
   * Throws at the deadline: a sweep that never finished has no trustworthy
   * children, so the caller must see a failure rather than an empty result.
   */
  private async waitForSweep(executionId: string): Promise<Record<string, unknown>> {
    const deadline = Date.now() + (this.options.maxWaitMs ?? 30 * 60_000);
    const pollIntervalMs = this.options.pollIntervalMs ?? 10_000;
    let lastStatus: string | undefined;
    while (Date.now() < deadline) {
      const execution = await this.getExecution(executionId, {});
      lastStatus = typeof execution.status === 'string' ? execution.status : undefined;
      if (isTerminal(lastStatus)) {
        return execution;
      }
      await sleep(pollIntervalMs);
    }
    throw new Error(
      `[hunt-watch] sweep ${executionId} did not reach a terminal status before the deadline (last status: ${lastStatus})`
    );
  }

  /** `GET /api/workflows/executions/{id}`; `includeInput`/`includeOutput` gate the step `input`/`output` fields. */
  private async getExecution(
    executionId: string,
    flags: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<Record<string, unknown>> {
    const response = await this.kbnClient.request<Record<string, unknown>>({
      path: `/api/workflows/executions/${encodeURIComponent(executionId)}`,
      method: 'GET',
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: flags,
    });
    return response.data;
  }

  /**
   * Reads the coordinator output per report from the sweep's child
   * executions. `GET .../children` returns a summary only (step `input` and
   * `output` are excluded server-side and the child `context` is absent), so
   * each hunt child is fetched individually with `includeInput` and
   * `includeOutput`. The coordinator run is async: `run_hunt_coordinator`
   * returns only a run envelope and the body is read back by the
   * `read_hunt_result` step; the report id is the child's
   * `context.inputs.reportId` (passed by the Worker as
   * `reportId: "{{ foreach.item }}"`).
   *
   * A child with no readable coordinator output is absent from the returned
   * map; the caller records that report as INVALID.
   */
  private async readSweepCoordinatorOutputs(
    sweepExecutionId: string
  ): Promise<Map<string, CoordinatorRun>> {
    await this.waitForSweep(sweepExecutionId);
    const runs = new Map<string, CoordinatorRun>();

    const childrenResponse = await this.kbnClient.request<Array<Record<string, unknown>>>({
      path: `/api/workflows/executions/${encodeURIComponent(sweepExecutionId)}/children`,
      method: 'GET',
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    });

    const huntChildren = childrenResponse.data.filter(
      (c): c is { executionId: string } & Record<string, unknown> =>
        c.workflowId === HUNT_EXECUTE_WORKFLOW_ID && typeof c.executionId === 'string'
    );
    for (const child of huntChildren) {
      const execution = await this.getExecution(child.executionId, {
        includeInput: true,
        includeOutput: true,
      });
      const context = isRecord(execution.context) ? execution.context : undefined;
      const inputs = isRecord(context?.inputs) ? context?.inputs : undefined;
      const reportId = typeof inputs?.reportId === 'string' ? inputs.reportId : undefined;
      const steps = Array.isArray(execution.stepExecutions) ? execution.stepExecutions : [];
      const output = readHuntResultOutput(steps);
      if (reportId !== undefined && isCoordinatorResult(output)) {
        runs.set(reportId, wireToCoordinatorRun(output));
      }
    }
    return runs;
  }
}
