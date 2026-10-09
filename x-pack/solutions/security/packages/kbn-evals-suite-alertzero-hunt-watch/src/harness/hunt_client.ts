/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/kbn-client';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CoordinatorRun } from '../types';

const WORKFLOWS_API_VERSION = '2023-10-31';
const ALERTZERO_API_VERSION = '1';

const INGEST_THREAT_REPORT_URL = '/internal/threat_intel/ingest_threat_report';
const CANDIDATES_URL = '/internal/alertzero/hunt/candidates';
const REPORT_IDS_CAP = 10; // candidates_route.gen.ts: report_ids max 10

export interface HuntWatchClientOptions {
  huntWorkerWorkflowId: string;
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const TERMINAL_STATUSES = new Set(['succeeded', 'finished', 'failed', 'canceled', 'cancelled']);

const isTerminal = (status: string | undefined): boolean =>
  status !== undefined && TERMINAL_STATUSES.has(status);

/**
 * Drives the Hunt Watch SUT over production HTTP routes (design v1 §4, v6
 * §4a): report ingest through `/internal/threat_intel/ingest_threat_report`
 * (ES mints the id; `op_type: create`), the candidates route for the
 * per-batch selection assertion, and the Worker manual trigger with
 * `reportIds`, polling the sweep to a terminal status and reading each hunt's
 * coordinator output from the `run_hunt_coordinator` STEP output of the
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
      body: { document },
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
   * coordinator output per report id, read from the run_hunt_coordinator step
   * output of the child executions. A per-batch candidates violation is
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
      const perBatchOk = candidates.ids.length === batch.length && candidates.skipped.length === 0;
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

  /** Polls one sweep to terminal status (runs are hunts, minutes each). */
  private async waitForSweep(executionId: string): Promise<Record<string, unknown> | undefined> {
    const deadline = Date.now() + (this.options.maxWaitMs ?? 30 * 60_000);
    const pollIntervalMs = this.options.pollIntervalMs ?? 10_000;
    let execution: Record<string, unknown> | undefined;
    while (Date.now() < deadline) {
      const response = await this.kbnClient.request<Record<string, unknown>>({
        path: `/api/workflows/executions/${executionId}`,
        method: 'GET',
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
        query: { includeOutput: true },
      });
      execution = response.data;
      if (isTerminal(typeof execution.status === 'string' ? execution.status : undefined)) {
        return execution;
      }
      await sleep(pollIntervalMs);
    }
    return execution;
  }

  /**
   * Reads the coordinator output per report from the sweep's child
   * executions. Each child of the report fan-out runs the
   * `system-security-hunt-execute` workflow; the coordinator result lives on
   * the `run_hunt_coordinator` step's output, not the execution-level output.
   */
  private async readSweepCoordinatorOutputs(
    sweepExecutionId: string
  ): Promise<Map<string, CoordinatorRun>> {
    await this.waitForSweep(sweepExecutionId);
    const runs = new Map<string, CoordinatorRun>();

    const childrenResponse = await this.kbnClient.request<Array<Record<string, unknown>>>({
      path: `/api/workflows/executions/${sweepExecutionId}/children`,
      method: 'GET',
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
    });

    for (const child of childrenResponse.data) {
      const reportIdOf = (): string | undefined => {
        if (child.workflowId !== 'system-security-hunt-execute') return undefined;
        // The hunt child receives reportId in its inputs.
        const context = isRecord(child.context) ? child.context : undefined;
        const inputs = isRecord(context?.inputs) ? context?.inputs : undefined;
        return typeof inputs?.reportId === 'string' ? inputs.reportId : undefined;
      };
      const steps = Array.isArray(child.stepExecutions) ? child.stepExecutions : [];
      const coordinatorStep = steps.find((s) => isRecord(s) && s.stepId === 'run_hunt_coordinator');
      const output = isRecord(coordinatorStep) ? coordinatorStep.output : undefined;
      const reportId = reportIdOf();
      if (reportId !== undefined && isRecord(output)) {
        runs.set(reportId, output as unknown as CoordinatorRun);
      }
    }
    return runs;
  }
}
