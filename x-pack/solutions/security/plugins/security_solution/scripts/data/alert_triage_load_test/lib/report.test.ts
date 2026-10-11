/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import type { MetricsSample } from './collector';
import { WORK_DONE_STEP_ID } from './progress';
import type { ReportInput } from './report';
import { buildReport, distribution, renderReportMarkdown } from './report';
import type { DispatchRecord } from './types';

const RUN_START = '2026-09-30T12:00:00.000Z';
const RUN_END = '2026-09-30T13:00:00.000Z';

const at = (seconds: number): string =>
  new Date(Date.parse(RUN_START) + seconds * 1000).toISOString();

const buildDispatch = (overrides: Partial<DispatchRecord> = {}): DispatchRecord => ({
  batchId: 'batch-0001',
  ruleIndex: 0,
  ruleUuid: 'rule-0',
  plannedOffsetMs: 0,
  dispatchedAt: at(0),
  alerts: [
    { id: 'alert-fp', label: 'false_positive' },
    { id: 'alert-tp', label: 'true_positive' },
  ],
  indexMs: 20,
  runApiMs: 100,
  executionId: 'execution-1',
  ...overrides,
});

const buildExecution = (
  overrides: Partial<WorkflowExecutionSummary> = {}
): WorkflowExecutionSummary => ({
  id: 'execution-1',
  status: 'waiting_for_child',
  startedAt: at(5),
  ...overrides,
});

const buildStep = (
  overrides: Partial<WorkflowStepExecutionSummary> = {}
): WorkflowStepExecutionSummary => ({
  id: 'step-1',
  stepId: WORK_DONE_STEP_ID,
  workflowRunId: 'execution-1',
  status: 'completed',
  startedAt: at(40),
  finishedAt: at(45),
  executionTimeMs: 5000,
  ...overrides,
});

const buildSample = (overrides: Partial<MetricsSample> = {}): MetricsSample => ({
  at: at(60),
  elapsedMs: 60000,
  dispatchedBatches: 1,
  batchesByPhase: {},
  workerExecutionsByStatus: {},
  childExecutionsByStatus: {},
  ...overrides,
});

const buildInput = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  dispatches: [buildDispatch()],
  snapshot: {
    takenAt: RUN_END,
    workerExecutions: [buildExecution()],
    workDoneSteps: [buildStep()],
    childExecutionErrors: {},
    childExecutions: {},
  },
  stepExecutions: {},
  samples: [],
  verdictsByAlertId: { 'alert-fp': 'false_positive', 'alert-tp': 'true_positive' },
  runStartedAt: RUN_START,
  runEndedAt: RUN_END,
  ...overrides,
});

describe('distribution', () => {
  it('returns nothing for no values', () => {
    expect(distribution([])).toBeUndefined();
  });

  it('computes nearest-rank percentiles', () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);

    expect(distribution(values)).toMatchObject({
      count: 100,
      min: 1,
      p50: 50,
      p90: 90,
      p95: 95,
      p99: 99,
      max: 100,
      mean: 50.5,
    });
  });

  it('handles a single value', () => {
    expect(distribution([42])).toMatchObject({ p50: 42, p99: 42, max: 42 });
  });
});

describe('buildReport', () => {
  it('measures how long a batch waited to start and to be triaged', () => {
    const { latencyMs } = buildReport(buildInput());

    expect(latencyMs.dispatchToStart?.p50).toBe(5000);
    expect(latencyMs.dispatchToTriaged?.p50).toBe(45000);
    expect(latencyMs.startToTriaged?.p50).toBe(40000);
  });

  it('counts a Worker run parked on a proposal as triaged', () => {
    const report = buildReport(buildInput());

    expect(report.batchesByPhase).toEqual({ parked: 1 });
    expect(report.throughput.alertsTriaged).toBe(2);
    expect(report.throughput.alertsPerHourTriaged).toBe(2);
  });

  it('keeps the recorded window when every batch was triaged inside it', () => {
    const { window } = buildReport(buildInput());

    expect(window).toEqual({ startedAt: RUN_START, endedAt: RUN_END, wallClockMs: 3_600_000 });
  });

  it('extends the window to batches triaged after the run ended, so throughput is not inflated', () => {
    const report = buildReport(
      buildInput({
        runEndedAt: at(60),
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution()],
          workDoneSteps: [buildStep({ finishedAt: at(1800) })],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.window).toEqual({
      startedAt: RUN_START,
      endedAt: at(1800),
      wallClockMs: 1_800_000,
    });
    // 2 alerts over half an hour, not over the recorded minute (which would be 120 per hour)
    expect(report.throughput.alertsPerHourTriaged).toBe(4);
  });

  it('does not extend the window for work that was never triaged', () => {
    const report = buildReport(
      buildInput({
        runEndedAt: at(60),
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution({ status: 'running' })],
          workDoneSteps: [],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.window.endedAt).toBe(at(60));
  });

  it('does not count a run that has not been triaged yet', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution({ status: 'running' })],
          workDoneSteps: [],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.batchesByPhase).toEqual({ running: 1 });
    expect(report.throughput.alertsTriaged).toBe(0);
    expect(report.latencyMs.dispatchToTriaged).toBeUndefined();
  });

  it('reports batches that failed to dispatch', () => {
    const report = buildReport(
      buildInput({
        dispatches: [buildDispatch({ executionId: undefined, error: 'boom' })],
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [],
          workDoneSteps: [],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.dispatch.failedBatches).toBe(1);
    expect(report.batchesByPhase).toEqual({ dispatch_failed: 1 });
    expect(report.dispatch.apiMs).toBeUndefined();
  });

  it('groups failed executions by reason', () => {
    const report = buildReport(
      buildInput({
        dispatches: [
          buildDispatch({ executionId: 'a' }),
          buildDispatch({ executionId: 'b' }),
          buildDispatch({ executionId: 'c' }),
        ],
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [
            buildExecution({ id: 'a', status: 'failed', error: { message: 'rate limited' } }),
            buildExecution({ id: 'b', status: 'failed', error: { message: 'rate limited' } }),
            buildExecution({ id: 'c', status: 'completed' }),
          ],
          workDoneSteps: [],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.failures).toEqual([{ message: 'failed: rate limited', count: 2 }]);
  });

  it('summarises step durations of the run only', () => {
    const report = buildReport(
      buildInput({
        stepExecutions: {
          classify_alerts: [
            buildStep({ stepId: 'classify_alerts', executionTimeMs: 30000 }),
            buildStep({
              stepId: 'classify_alerts',
              workflowRunId: 'other',
              executionTimeMs: 999999,
            }),
          ],
        },
      })
    );

    expect(report.latencyMs.steps.classify_alerts?.max).toBe(30000);
  });

  it('scores the verdicts against the ground truth', () => {
    const report = buildReport(
      buildInput({
        dispatches: [
          buildDispatch({
            alerts: [
              { id: 'fp-1', label: 'false_positive' },
              { id: 'fp-2', label: 'false_positive' },
              { id: 'fp-3', label: 'false_positive' },
              { id: 'fp-4', label: 'false_positive' },
              { id: 'tp-1', label: 'true_positive' },
              { id: 'tp-2', label: 'true_positive' },
            ],
          }),
        ],
        verdictsByAlertId: {
          'fp-1': 'false_positive',
          'fp-2': 'false_positive',
          'fp-3': 'inconclusive',
          'tp-1': 'false_positive',
          'tp-2': 'true_positive',
        },
      })
    );

    expect(report.accuracy.byLabel.false_positive).toEqual({
      true_positive: 0,
      false_positive: 2,
      inconclusive: 1,
      none: 1,
    });
    expect(report.accuracy.falsePositiveRecall).toBe(0.5);
    expect(report.accuracy.truePositiveMissedAsFalsePositive).toBe(0.5);
  });

  it('only scores alerts of triaged batches', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution({ status: 'running' })],
          workDoneSteps: [],
          childExecutionErrors: {},
          childExecutions: {},
        },
      })
    );

    expect(report.accuracy.alertsScored).toBe(0);
    expect(report.accuracy.falsePositiveRecall).toBeUndefined();
  });

  it('finds the peaks over the samples', () => {
    const report = buildReport(
      buildInput({
        samples: [
          buildSample({
            workerExecutionsByStatus: { running: 3, waiting_for_child: 4, completed: 50 },
            taskManager: { driftP99Ms: 500, overdueTasks: 2, loadP50: 10 },
          }),
          buildSample({
            workerExecutionsByStatus: { running: 1, waiting_for_child: 9, failed: 2 },
            taskManager: { driftP99Ms: 9000, overdueTasks: 40, loadP50: 70 },
          }),
        ],
      })
    );

    expect(report.peaks).toEqual({
      inFlightWorkerExecutions: 10,
      taskManagerDriftP99Ms: 9000,
      taskManagerOverdueTasks: 40,
      taskManagerLoadP50: 70,
    });
  });

  it('reports no Task Manager peaks when it could not be read', () => {
    const report = buildReport(buildInput({ samples: [buildSample()] }));

    expect(report.peaks.taskManagerDriftP99Ms).toBeUndefined();
  });

  it('counts the proposal executions still waiting for a decision', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution()],
          workDoneSteps: [buildStep()],
          childExecutionErrors: {},
          childExecutions: {
            'system-create-alertzero-proposal': [
              buildExecution({ id: 'p1', status: 'waiting' }),
              buildExecution({ id: 'p2', status: 'waiting_for_input' }),
              buildExecution({ id: 'p3', status: 'completed' }),
            ],
          },
        },
      })
    );

    expect(report.childExecutions['system-create-alertzero-proposal'].open).toBe(2);
  });

  it('flags a child workflow whose executions could not be listed', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution()],
          workDoneSteps: [buildStep()],
          childExecutions: { 'system-create-alertzero-proposal': [] },
          childExecutionErrors: { 'system-create-alertzero-proposal': '403 Forbidden' },
        },
      })
    );

    expect(report.childExecutions['system-create-alertzero-proposal'].error).toBe('403 Forbidden');
    expect(renderReportMarkdown(report)).toContain(
      '`system-create-alertzero-proposal`: executions unavailable (403 Forbidden)'
    );
  });

  it('leaves the error out for a child workflow that was listed', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution()],
          workDoneSteps: [buildStep()],
          childExecutions: { 'system-create-alertzero-proposal': [] },
          childExecutionErrors: {},
        },
      })
    );

    expect(report.childExecutions['system-create-alertzero-proposal']).not.toHaveProperty('error');
  });

  it('sums token usage over executions', () => {
    const report = buildReport(
      buildInput({
        snapshot: {
          takenAt: RUN_END,
          workerExecutions: [buildExecution({ usage: { inputTokens: 100, outputTokens: 10 } })],
          workDoneSteps: [buildStep()],
          childExecutionErrors: {},
          childExecutions: {
            'system-security-alert-analysis': [
              buildExecution({ id: 'c1', usage: { inputTokens: 900, outputTokens: 90 } }),
            ],
          },
        },
      })
    );

    expect(report.tokenUsage).toEqual({ inputTokens: 1000, outputTokens: 100 });
  });
});

describe('renderReportMarkdown', () => {
  it('renders every section', () => {
    const markdown = renderReportMarkdown(buildReport(buildInput()));

    expect(markdown).toContain('# Alert Triage load test summary');
    expect(markdown).toContain('## Latency (ms)');
    expect(markdown).toContain('## Throughput and saturation');
    expect(markdown).toContain('## Accuracy (triaged alerts only)');
    expect(markdown).toContain('## Failures');
  });
});
