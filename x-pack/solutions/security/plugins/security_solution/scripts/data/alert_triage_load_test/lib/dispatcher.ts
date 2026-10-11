/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import { assertNoBulkErrors } from '../../lib/bulk';
import { formatError } from '../../lib/type_guards';
import { buildAlertId, buildRuleUuid, cloneAlert } from './alert_clone';
import { runWorkflow } from './kibana_api';
import type { TemplatePool } from './templates';
import type { DispatchRecord, LoadPlan, PlannedBatch } from './types';

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

/** Runs at most `limit` tasks at once; the rest wait their turn. */
const createLimiter = (limit: number) => {
  let active = 0;
  const waiting: Array<() => void> = [];

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
};

interface DispatchContext {
  esClient: Client;
  kbnClient: KbnClient;
  log: ToolingLog;
  pool: TemplatePool;
  runId: string;
  alertsIndex: string;
  workerWorkflowId: string;
}

const dispatchBatch = async (
  batch: PlannedBatch,
  { esClient, kbnClient, log, pool, runId, alertsIndex, workerWorkflowId }: DispatchContext
): Promise<DispatchRecord> => {
  const ruleUuid = buildRuleUuid(runId, batch.ruleIndex);
  const executionUuid = randomUUID();
  const nowIso = new Date().toISOString();

  const alerts = batch.alerts.map(({ label, templateIndex }, position) => ({
    id: buildAlertId(runId, batch.batchId, position),
    label,
    source: cloneAlert({
      template:
        label === 'false_positive'
          ? pool.falsePositives[templateIndex]
          : pool.truePositives[templateIndex],
      alertId: buildAlertId(runId, batch.batchId, position),
      ruleUuid,
      runId,
      executionUuid,
      nowIso,
    }),
  }));

  const record: DispatchRecord = {
    batchId: batch.batchId,
    ruleIndex: batch.ruleIndex,
    ruleUuid,
    plannedOffsetMs: batch.dispatchOffsetMs,
    dispatchedAt: nowIso,
    alerts: alerts.map(({ id, label }) => ({ id, label })),
    indexMs: 0,
    runApiMs: 0,
  };

  try {
    const indexStart = Date.now();
    const response = await esClient.bulk({
      refresh: 'wait_for',
      operations: alerts.flatMap(({ id, source }) => [
        { create: { _index: alertsIndex, _id: id } },
        source,
      ]),
    });
    assertNoBulkErrors(alertsIndex, response, log);
    record.indexMs = Date.now() - indexStart;

    const runStart = Date.now();
    record.dispatchedAt = new Date(runStart).toISOString();
    record.executionId = await runWorkflow({
      kbnClient,
      workflowId: workerWorkflowId,
      inputs: {
        event: {
          triggerType: 'alert',
          alertIds: alerts.map(({ id }) => ({ _id: id, _index: alertsIndex })),
        },
      },
    });
    record.runApiMs = Date.now() - runStart;
  } catch (error) {
    record.error = formatError(error);
    log.warning(`${batch.batchId}: dispatch failed: ${record.error}`);
  }

  return record;
};

/**
 * Walks the plan in real time: waits for each batch's offset, indexes its alerts, then starts the
 * Worker on them. Dispatches overlap up to `dispatchConcurrency`, so a slow run API call cannot hold
 * back the schedule.
 */
export const executePlan = async ({
  plan,
  dispatchConcurrency,
  onDispatched,
  ...context
}: DispatchContext & {
  plan: LoadPlan;
  dispatchConcurrency: number;
  onDispatched: (record: DispatchRecord) => void;
}): Promise<DispatchRecord[]> => {
  const { log } = context;
  const limit = createLimiter(dispatchConcurrency);
  const startMs = Date.now();
  const inFlight: Array<Promise<DispatchRecord>> = [];
  let completed = 0;

  for (const batch of plan.batches) {
    await sleep(startMs + batch.dispatchOffsetMs - Date.now());
    inFlight.push(
      limit(() => dispatchBatch(batch, context)).then((record) => {
        completed++;
        onDispatched(record);
        if (completed % 25 === 0 || completed === plan.batches.length) {
          log.info(`Dispatched ${completed}/${plan.batches.length} batches`);
        }
        return record;
      })
    );
  }

  return Promise.all(inFlight);
};
