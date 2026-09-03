/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import type { CorrelatedExecution } from '../correlate_executions';
import { buildRunRows, RUN_REASON_MAX_LENGTH } from '.';

const correlatedExecution = (overrides: {
  correlationId?: string;
  execution?: Record<string, unknown>;
  watchId?: string;
}): CorrelatedExecution =>
  ({
    correlationId: overrides.correlationId ?? 'ad-1',
    event: undefined,
    execution: {
      id: 'run-1',
      status: 'completed',
      startedAt: '2026-08-02T00:00:00.000Z',
      finishedAt: '2026-08-02T00:01:00.000Z',
      workflowId: 'wf-deep',
      error: null,
      ...overrides.execution,
    },
    watchId: overrides.watchId ?? SYSTEM_SECURITY_WATCH_DEEP_ID,
  } as unknown as CorrelatedExecution);

describe('buildRunRows', () => {
  it('projects a correlated execution into a run row', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({})],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row).toEqual(
      expect.objectContaining({
        correlationId: 'ad-1',
        executionId: 'run-1',
        status: 'succeeded',
        watchId: SYSTEM_SECURITY_WATCH_DEEP_ID,
        workflowId: 'wf-deep',
        workflowRunId: 'run-1',
      })
    );
  });

  it('builds the deep link from the execution workflow id and run id', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({})],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.deepLinkPath).toEqual('/wf-deep?tab=executions&executionId=run-1');
  });

  it('deep-links to the one gate a run is parked at, its single interesting step (F1)', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'waiting_for_input' } })],
      pendingGateStepExecutionIdsByRunId: new Map([['run-1', ['step-exec-gate']]]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.deepLinkPath).toEqual(
      '/wf-deep?tab=executions&executionId=run-1&stepExecutionId=step-exec-gate'
    );
  });

  it('keeps the execution-level deep link when several gates are pending (F1)', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'waiting_for_input' } })],
      pendingGateStepExecutionIdsByRunId: new Map([['run-1', ['step-exec-a', 'step-exec-b']]]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.deepLinkPath).toEqual('/wf-deep?tab=executions&executionId=run-1');
  });

  it('surfaces the pending gate count for a run parked at several gates', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'waiting_for_input' } })],
      pendingGateStepExecutionIdsByRunId: new Map([['run-1', ['step-exec-a', 'step-exec-b']]]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.pendingGateCount).toEqual(2);
  });

  it('maps the closed status enum, never a raw passthrough', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'waiting_for_input' } })],
      pendingGateStepExecutionIdsByRunId: new Map([['run-1', ['step-exec-gate']]]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.status).toEqual('waiting_for_input');
  });

  it('surfaces the pending gate count for a run parked at a gate', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'waiting_for_input' } })],
      pendingGateStepExecutionIdsByRunId: new Map([['run-1', ['step-exec-gate']]]),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.pendingGateCount).toEqual(1);
  });

  it('defaults the pending gate count to zero', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({})],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.pendingGateCount).toEqual(0);
  });

  it('excludes a run whose discovery the caller cannot read (S3)', () => {
    const rows = buildRunRows({
      correlated: [correlatedExecution({ correlationId: 'ad-secret' })],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(rows).toEqual([]);
  });

  it('keeps a run with no correlation, exposing no discovery content', () => {
    const rows = buildRunRows({
      correlated: [correlatedExecution({ correlationId: '' })],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(),
    });

    expect(rows).toHaveLength(1);
  });

  it('sets endedAt for a terminal run', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({})],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.endedAt).toEqual('2026-08-02T00:01:00.000Z');
  });

  it('omits endedAt while a run is non-terminal', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { status: 'running', finishedAt: '' } })],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.endedAt).toBeUndefined();
  });

  it('sets reason from the error message for an unsuccessful terminal run', () => {
    const [row] = buildRunRows({
      correlated: [
        correlatedExecution({ execution: { status: 'failed', error: { message: 'boom' } } }),
      ],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.reason).toEqual('boom');
  });

  it('omits reason for a successful run', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({})],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.reason).toBeUndefined();
  });

  it('clamps an over-long failure reason to the contract bound', () => {
    const [row] = buildRunRows({
      correlated: [
        correlatedExecution({
          execution: {
            status: 'failed',
            error: { message: 'x'.repeat(RUN_REASON_MAX_LENGTH * 2) },
          },
        }),
      ],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.reason?.length).toEqual(RUN_REASON_MAX_LENGTH);
  });

  it('passes through triggeredBy when the engine recorded it', () => {
    const [row] = buildRunRows({
      correlated: [correlatedExecution({ execution: { triggeredBy: 'scheduled' } })],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.triggeredBy).toEqual('scheduled');
  });

  it('falls back to the watch id for the deep link when the execution has no workflow id', () => {
    const [row] = buildRunRows({
      correlated: [
        correlatedExecution({
          execution: { workflowId: undefined },
          watchId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
        }),
      ],
      pendingGateStepExecutionIdsByRunId: new Map(),
      readableAttackDiscoveryAlertIds: new Set(['ad-1']),
    });

    expect(row.workflowId).toEqual(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
  });
});
