/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { ToolingLog } from '@kbn/tooling-log';
import { createEsClient, createKbnClient } from '../../lib/clients';
import type { AlertSource } from './alert_clone';
import { buildAlertId } from './alert_clone';
import { executePlan } from './dispatcher';
import { runWorkflow } from './kibana_api';
import type { TemplatePool } from './templates';
import type { DispatchRecord, LoadPlan, PlannedBatch } from './types';

jest.mock('./kibana_api', () => ({ runWorkflow: jest.fn() }));

const RUN_ID = 'run-1';
const ALERTS_INDEX = '.alerts-security.alerts-default';
const WORKER_WORKFLOW_ID = 'system-security-floor-alert-triage';

const buildTemplate = (name: string): AlertSource => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  'kibana.alert.uuid': `${name}-uuid`,
  'kibana.alert.rule.uuid': 'template-rule',
  'kibana.alert.rule.name': name,
  'kibana.alert.rule.tags': ['data-generator', 'data-generator-fp'],
  tags: ['data-generator-fp'],
});

const pool: TemplatePool = {
  truePositives: [buildTemplate('true-positive')],
  falsePositives: [buildTemplate('false-positive')],
};

const buildBatch = (batchId: string, overrides: Partial<PlannedBatch> = {}): PlannedBatch => ({
  batchId,
  ruleIndex: 0,
  dispatchOffsetMs: 0,
  alerts: [
    { label: 'true_positive', templateIndex: 0 },
    { label: 'false_positive', templateIndex: 0 },
  ],
  ...overrides,
});

const buildPlan = (batches: PlannedBatch[]): LoadPlan => ({
  seed: 1,
  ruleCount: 1,
  batches,
  totalAlerts: batches.reduce((total, { alerts }) => total + alerts.length, 0),
  falsePositiveAlerts: 0,
  lastDispatchOffsetMs: 0,
});

const bulkSucceeded: BulkResponse = { took: 1, errors: false, items: [] };

const bulkRejected: BulkResponse = {
  took: 1,
  errors: true,
  items: [
    {
      create: {
        _index: ALERTS_INDEX,
        status: 400,
        error: { type: 'mapper_parsing_exception', reason: 'failed to parse' },
      },
    },
  ],
};

describe('executePlan', () => {
  const log = new ToolingLog();
  const stack = {
    kibanaUrl: 'http://localhost:5601',
    elasticsearchUrl: 'http://localhost:9200',
    auth: { type: 'basic' as const, username: 'elastic', password: 'changeme' },
  };
  const esClient = createEsClient(stack);
  const kbnClient = createKbnClient({ ...stack, log });
  const runWorkflowMock = jest.mocked(runWorkflow);

  let bulkSpy: jest.SpyInstance;
  let dispatched: DispatchRecord[];

  const execute = (batches: PlannedBatch[]): Promise<DispatchRecord[]> =>
    executePlan({
      plan: buildPlan(batches),
      dispatchConcurrency: 2,
      onDispatched: (record) => dispatched.push(record),
      esClient,
      kbnClient,
      log,
      pool,
      runId: RUN_ID,
      alertsIndex: ALERTS_INDEX,
      workerWorkflowId: WORKER_WORKFLOW_ID,
    });

  beforeEach(() => {
    dispatched = [];
    runWorkflowMock.mockReset().mockResolvedValue('execution-1');
    bulkSpy = jest.spyOn(esClient, 'bulk').mockResolvedValue(bulkSucceeded);
  });

  afterEach(() => {
    bulkSpy.mockRestore();
  });

  it('indexes the alerts of a batch and starts the Worker on exactly those alerts', async () => {
    const [record] = await execute([buildBatch('batch-0')]);

    const alertIds = [0, 1].map((position) => buildAlertId(RUN_ID, 'batch-0', position));
    expect(bulkSpy).toHaveBeenCalledTimes(1);
    expect(bulkSpy.mock.calls[0][0]).toMatchObject({
      refresh: 'wait_for',
      operations: [
        { create: { _index: ALERTS_INDEX, _id: alertIds[0] } },
        expect.objectContaining({ 'kibana.alert.uuid': alertIds[0] }),
        { create: { _index: ALERTS_INDEX, _id: alertIds[1] } },
        expect.objectContaining({ 'kibana.alert.uuid': alertIds[1] }),
      ],
    });
    expect(runWorkflowMock).toHaveBeenCalledWith({
      kbnClient,
      workflowId: WORKER_WORKFLOW_ID,
      inputs: {
        event: {
          triggerType: 'alert',
          alertIds: alertIds.map((id) => ({ _id: id, _index: ALERTS_INDEX })),
        },
      },
    });
    expect(record).toMatchObject({
      batchId: 'batch-0',
      executionId: 'execution-1',
      alerts: [
        { id: alertIds[0], label: 'true_positive' },
        { id: alertIds[1], label: 'false_positive' },
      ],
    });
    expect(record.error).toBeUndefined();
  });

  it('reports every dispatched batch to the caller', async () => {
    const records = await execute([buildBatch('batch-0'), buildBatch('batch-1')]);

    expect(dispatched.map(({ batchId }) => batchId).sort()).toEqual(['batch-0', 'batch-1']);
    expect(records.map(({ batchId }) => batchId)).toEqual(['batch-0', 'batch-1']);
  });

  it('does not leak the ground-truth label through the indexed documents', async () => {
    await execute([buildBatch('batch-0')]);

    expect(JSON.stringify(bulkSpy.mock.calls[0][0])).not.toContain('data-generator');
  });

  it('does not start the Worker when indexing the alerts failed', async () => {
    bulkSpy.mockResolvedValue(bulkRejected);

    const [record] = await execute([buildBatch('batch-0')]);

    expect(runWorkflowMock).not.toHaveBeenCalled();
    expect(record.error).toContain('Bulk indexing errors');
    expect(record.executionId).toBeUndefined();
    expect(record.alerts).toHaveLength(2);
  });

  it('records a failed run request on the batch', async () => {
    runWorkflowMock.mockRejectedValue(new Error('workflow not found'));

    const [record] = await execute([buildBatch('batch-0')]);

    expect(record.error).toContain('workflow not found');
    expect(record.executionId).toBeUndefined();
  });

  it('keeps dispatching the remaining batches after one fails', async () => {
    runWorkflowMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValue('execution-2');

    const records = await execute([buildBatch('batch-0'), buildBatch('batch-1')]);

    expect(records[0].error).toContain('boom');
    expect(records[1]).toMatchObject({ batchId: 'batch-1', executionId: 'execution-2' });
    expect(records[1].error).toBeUndefined();
  });

  it('gives each rule its own synthetic rule uuid', async () => {
    const records = await execute([
      buildBatch('batch-0', { ruleIndex: 0 }),
      buildBatch('batch-1', { ruleIndex: 1 }),
    ]);

    expect(records[0].ruleUuid).not.toBe(records[1].ruleUuid);
  });
});
