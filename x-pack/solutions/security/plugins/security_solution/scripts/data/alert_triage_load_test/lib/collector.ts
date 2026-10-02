/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { formatError } from '../../lib/type_guards';
import { getTaskManagerHealth, getTaskManagerMetrics } from './kibana_api';
import type { DispatchPhase, ProgressSnapshot } from './progress';
import { classifyDispatches, countBy, fetchProgress, isSettled } from './progress';
import type { TaskManagerSample } from './task_manager';
import { extractTaskManagerSample } from './task_manager';
import type { DispatchRecord } from './types';

export interface MetricsSample {
  at: string;
  elapsedMs: number;
  dispatchedBatches: number;
  /** Batches per phase; `parked` and `finished` are the settled ones. */
  batchesByPhase: Partial<Record<DispatchPhase, number>>;
  workerExecutionsByStatus: Record<string, number>;
  /** Every execution of the child workflows since the run started, including other Workers'. */
  /** Every execution of the child workflows since the run started, including other Workers'. */
  childExecutionsByStatus: Record<string, Record<string, number>>;
  /** Child workflows whose executions could not be listed in this sample, by workflow id. */
  childExecutionErrors?: Record<string, string>;
  taskManager?: TaskManagerSample;
  error?: string;
}

export interface Collector {
  /** Takes one sample right now; the loop calls this on its interval. */
  sampleNow: () => Promise<MetricsSample>;
  latest: () => MetricsSample | undefined;
  /** Resolves `settled: true` once every dispatched batch is settled, `false` after `timeoutMs`. */
  waitUntilSettled: (timeoutMs: number) => Promise<{ settled: boolean }>;
  stop: () => Promise<void>;
}

interface CollectorOptions {
  kbnClient: KbnClient;
  log: ToolingLog;
  workerWorkflowId: string;
  childWorkflowIds: string[];
  getDispatches: () => DispatchRecord[];
  runStartedAt: string;
  intervalMs: number;
  samplesFile: string;
  taskManagerRawFile: string;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Samples Workflows execution state and Task Manager health on an interval and appends each sample
 * to an NDJSON file. One failed poll is recorded and skipped; it never ends the run.
 */
export const startCollector = ({
  kbnClient,
  log,
  workerWorkflowId,
  childWorkflowIds,
  getDispatches,
  runStartedAt,
  intervalMs,
  samplesFile,
  taskManagerRawFile,
}: CollectorOptions): Collector => {
  const startedMs = Date.parse(runStartedAt);
  let latest: MetricsSample | undefined;
  let latestSnapshot: ProgressSnapshot | undefined;
  let stopped = false;
  const warnedChildErrors = new Map<string, string>();

  const warnAboutChildErrors = (errors: Record<string, string>): void => {
    const unreported = Object.entries(errors).filter(
      ([workflowId, message]) => warnedChildErrors.get(workflowId) !== message
    );
    for (const [workflowId, message] of unreported) {
      warnedChildErrors.set(workflowId, message);
      log.warning(`Could not list executions of ${workflowId}: ${message}`);
    }
  };

  const sampleTaskManager = async (): Promise<TaskManagerSample | undefined> => {
    try {
      const [health, metrics] = await Promise.all([
        getTaskManagerHealth({ kbnClient }),
        getTaskManagerMetrics({ kbnClient }).catch(() => undefined),
      ]);
      fs.appendFileSync(
        taskManagerRawFile,
        `${JSON.stringify({ at: new Date().toISOString(), health, metrics })}\n`
      );
      return extractTaskManagerSample(health);
    } catch (error) {
      log.debug(`Task Manager health unavailable: ${formatError(error)}`);
      return undefined;
    }
  };

  const sampleNow = async (): Promise<MetricsSample> => {
    const dispatches = getDispatches();
    const at = new Date();
    const sample: MetricsSample = {
      at: at.toISOString(),
      elapsedMs: at.getTime() - startedMs,
      dispatchedBatches: dispatches.length,
      batchesByPhase: {},
      workerExecutionsByStatus: {},
      childExecutionsByStatus: {},
    };

    try {
      const [snapshot, taskManager] = await Promise.all([
        fetchProgress({
          kbnClient,
          workerWorkflowId,
          childWorkflowIds,
          dispatches,
          runStartedAt,
        }),
        sampleTaskManager(),
      ]);
      latestSnapshot = snapshot;
      sample.taskManager = taskManager;
      sample.workerExecutionsByStatus = countBy(snapshot.workerExecutions, ({ status }) => status);
      sample.batchesByPhase = countBy(
        classifyDispatches({ dispatches, snapshot }),
        ({ phase }) => phase
      );
      sample.childExecutionsByStatus = Object.fromEntries(
        Object.entries(snapshot.childExecutions).map(([workflowId, executions]) => [
          workflowId,
          countBy(executions, ({ status }) => status),
        ])
      );
      if (Object.keys(snapshot.childExecutionErrors).length > 0) {
        sample.childExecutionErrors = snapshot.childExecutionErrors;
        warnAboutChildErrors(snapshot.childExecutionErrors);
      }
    } catch (error) {
      sample.error = formatError(error);
      log.warning(`Sample failed: ${sample.error}`);
    }

    latest = sample;
    fs.appendFileSync(samplesFile, `${JSON.stringify(sample)}\n`);
    return sample;
  };

  const loop = (async () => {
    while (!stopped) {
      await sampleNow();
      await sleep(intervalMs);
    }
  })();

  return {
    sampleNow,
    latest: () => latest,
    waitUntilSettled: async (timeoutMs) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const dispatches = getDispatches();
        if (latestSnapshot && dispatches.length > 0) {
          const progress = classifyDispatches({ dispatches, snapshot: latestSnapshot });
          if (progress.every(({ phase }) => isSettled(phase))) return { settled: true };
        }
        await sleep(Math.min(intervalMs, 5000));
      }
      return { settled: false };
    },
    stop: async () => {
      stopped = true;
      await loop;
    },
  };
};
