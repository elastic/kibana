/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import type { ProgressSnapshot } from './progress';
import { REPORTED_STEP_IDS, WORK_DONE_STEP_ID, classifyDispatches, isSettled } from './progress';
import type { DispatchRecord } from './types';

const buildDispatch = (overrides: Partial<DispatchRecord> = {}): DispatchRecord => ({
  batchId: 'batch-0001',
  ruleIndex: 0,
  ruleUuid: 'rule-0',
  plannedOffsetMs: 0,
  dispatchedAt: '2026-09-30T12:00:00.000Z',
  alerts: [{ id: 'alert-1', label: 'true_positive' }],
  indexMs: 20,
  runApiMs: 100,
  executionId: 'execution-1',
  ...overrides,
});

const buildExecution = (
  overrides: Partial<WorkflowExecutionSummary> = {}
): WorkflowExecutionSummary => ({
  id: 'execution-1',
  status: 'running',
  startedAt: '2026-09-30T12:00:05.000Z',
  ...overrides,
});

const buildStep = (
  overrides: Partial<WorkflowStepExecutionSummary> = {}
): WorkflowStepExecutionSummary => ({
  id: 'step-1',
  stepId: WORK_DONE_STEP_ID,
  workflowRunId: 'execution-1',
  status: 'completed',
  startedAt: '2026-09-30T12:05:00.000Z',
  finishedAt: '2026-09-30T12:05:01.000Z',
  ...overrides,
});

const buildSnapshot = (overrides: Partial<ProgressSnapshot> = {}): ProgressSnapshot => ({
  takenAt: '2026-09-30T12:10:00.000Z',
  workerExecutions: [buildExecution()],
  workDoneSteps: [],
  childExecutions: {},
  ...overrides,
});

describe('WORK_DONE_STEP_ID', () => {
  it('is not a per-alert step, whose first completion would mark the batch triaged early', () => {
    expect(WORK_DONE_STEP_ID).not.toBe('add_verdict_notes');
    expect(WORK_DONE_STEP_ID).not.toBe('set_az_tags');
  });

  it('keeps the per-alert note durations in the report breakdown', () => {
    expect(REPORTED_STEP_IDS).toContain('add_verdict_notes');
  });
});

describe('classifyDispatches', () => {
  const classify = (snapshot: ProgressSnapshot, dispatch = buildDispatch()) =>
    classifyDispatches({ dispatches: [dispatch], snapshot })[0];

  it('marks a batch without an execution id as failed to dispatch', () => {
    const { phase } = classify(buildSnapshot(), buildDispatch({ executionId: undefined }));

    expect(phase).toBe('dispatch_failed');
  });

  it('marks a batch whose execution is not listed yet as not visible', () => {
    const { phase } = classify(buildSnapshot({ workerExecutions: [] }));

    expect(phase).toBe('not_visible');
  });

  it('keeps a batch running until the work-done step has finished', () => {
    const { phase } = classify(buildSnapshot());

    expect(phase).toBe('running');
  });

  it('ignores a work-done step that is still in progress', () => {
    const { phase } = classify(
      buildSnapshot({ workDoneSteps: [buildStep({ status: 'running', finishedAt: undefined })] })
    );

    expect(phase).toBe('running');
  });

  it('parks a batch once the work-done step finished while the run waits on a decision', () => {
    const progress = classify(buildSnapshot({ workDoneSteps: [buildStep()] }));

    expect(progress.phase).toBe('parked');
    expect(progress.workDoneStep?.finishedAt).toBe('2026-09-30T12:05:01.000Z');
  });

  it('finishes a batch whose execution reached a terminal status', () => {
    const { phase } = classify(
      buildSnapshot({
        workerExecutions: [buildExecution({ status: 'completed' })],
        workDoneSteps: [buildStep()],
      })
    );

    expect(phase).toBe('finished');
  });

  it('only counts the work-done step of the batch own run', () => {
    const { phase } = classify(
      buildSnapshot({ workDoneSteps: [buildStep({ workflowRunId: 'execution-2' })] })
    );

    expect(phase).toBe('running');
  });
});

describe('isSettled', () => {
  it.each(['dispatch_failed', 'parked', 'finished'] as const)('settles %s', (phase) => {
    expect(isSettled(phase)).toBe(true);
  });

  it.each(['not_visible', 'running'] as const)('does not settle %s', (phase) => {
    expect(isSettled(phase)).toBe(false);
  });
});
