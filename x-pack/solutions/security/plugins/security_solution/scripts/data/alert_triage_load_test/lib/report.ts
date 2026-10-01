/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import type { MetricsSample } from './collector';
import type { DispatchPhase, ProgressSnapshot } from './progress';
import { TERMINAL_STATUSES, classifyDispatches, countBy, REPORTED_STEP_IDS } from './progress';
import type { AlertLabel, DispatchRecord } from './types';

export type Verdict = 'true_positive' | 'false_positive' | 'inconclusive';

export interface Distribution {
  count: number;
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

export interface ReportInput {
  dispatches: DispatchRecord[];
  snapshot: ProgressSnapshot;
  stepExecutions: Record<string, WorkflowStepExecutionSummary[]>;
  samples: MetricsSample[];
  /** Verdict the Worker tagged on each alert, by alert id; absent when the alert carries none. */
  verdictsByAlertId: Record<string, Verdict | undefined>;
  runStartedAt: string;
  runEndedAt: string;
}

export interface Report {
  window: { startedAt: string; endedAt: string; wallClockMs: number };
  dispatch: {
    batches: number;
    alerts: number;
    failedBatches: number;
    apiMs: Distribution | undefined;
    indexMs: Distribution | undefined;
  };
  batchesByPhase: Partial<Record<DispatchPhase, number>>;
  workerExecutionsByStatus: Record<string, number>;
  failures: Array<{ message: string; count: number }>;
  latencyMs: {
    /** Client dispatch clock to the execution's `startedAt` (server clock, so skew shows up here). */
    dispatchToStart: Distribution | undefined;
    /** Dispatch until the batch is classified, tagged and noted, i.e. triaged. */
    dispatchToTriaged: Distribution | undefined;
    /** Execution start until triaged; the Worker's own working time. */
    startToTriaged: Distribution | undefined;
    steps: Record<string, Distribution | undefined>;
  };
  throughput: {
    alertsTriaged: number;
    alertsPerHourTriaged: number | undefined;
  };
  peaks: {
    inFlightWorkerExecutions: number;
    taskManagerDriftP99Ms: number | undefined;
    taskManagerOverdueTasks: number | undefined;
    taskManagerLoadP50: number | undefined;
  };
  childExecutions: Record<string, { byStatus: Record<string, number>; open: number }>;
  accuracy: {
    alertsScored: number;
    byLabel: Record<AlertLabel, Record<Verdict | 'none', number>>;
    /** Share of false-positive alerts the Worker tagged false positive. */
    falsePositiveRecall: number | undefined;
    /** Share of true-positive alerts wrongly tagged false positive; the harmful error. */
    truePositiveMissedAsFalsePositive: number | undefined;
  };
  tokenUsage: Record<string, number>;
}

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** Nearest-rank percentile of an ascending array. */
const percentile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];

export const distribution = (values: number[]): Distribution | undefined => {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return undefined;
  const sorted = [...finite].sort((a, b) => a - b);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
    mean: round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
  };
};

const toMs = (iso: string | null | undefined): number | undefined => {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? undefined : ms;
};

const diff = (later: string | null | undefined, earlier: string | null | undefined) => {
  const a = toMs(later);
  const b = toMs(earlier);
  return a === undefined || b === undefined ? undefined : a - b;
};

const defined = (values: Array<number | undefined>): number[] =>
  values.filter((value): value is number => value !== undefined);

const sumNumericFields = (usages: Array<Record<string, unknown> | undefined>) => {
  const totals: Record<string, number> = {};
  for (const usage of usages) {
    for (const [key, value] of Object.entries(usage ?? {})) {
      if (typeof value === 'number') totals[key] = (totals[key] ?? 0) + value;
    }
  }
  return totals;
};

const maxOf = (values: Array<number | undefined>): number | undefined => {
  const present = defined(values);
  return present.length > 0 ? Math.max(...present) : undefined;
};

const emptyVerdictCounts = (): Record<Verdict | 'none', number> => ({
  true_positive: 0,
  false_positive: 0,
  inconclusive: 0,
  none: 0,
});

const failureMessage = (execution: WorkflowExecutionSummary): string =>
  `${execution.status}: ${execution.error?.message ?? 'no error message'}`.slice(0, 160);

export const buildReport = ({
  dispatches,
  snapshot,
  stepExecutions,
  samples,
  verdictsByAlertId,
  runStartedAt,
  runEndedAt,
}: ReportInput): Report => {
  const progress = classifyDispatches({ dispatches, snapshot });
  const runIds = new Set(snapshot.workerExecutions.map(({ id }) => id));
  const triagedProgress = progress.filter(({ workDoneStep }) => workDoneStep?.finishedAt);

  const wallClockMs = diff(runEndedAt, runStartedAt) ?? 0;
  const alertsTriaged = triagedProgress.reduce(
    (sum, { dispatch }) => sum + dispatch.alerts.length,
    0
  );

  const stepDistributions = Object.fromEntries(
    REPORTED_STEP_IDS.map((stepId) => [
      stepId,
      distribution(
        defined(
          (stepExecutions[stepId] ?? [])
            .filter(({ workflowRunId }) => runIds.has(workflowRunId))
            .map((step) => step.executionTimeMs ?? diff(step.finishedAt, step.startedAt))
        )
      ),
    ])
  );

  const byLabel: Record<AlertLabel, Record<Verdict | 'none', number>> = {
    true_positive: emptyVerdictCounts(),
    false_positive: emptyVerdictCounts(),
  };
  for (const { dispatch } of triagedProgress) {
    for (const { id, label } of dispatch.alerts) {
      byLabel[label][verdictsByAlertId[id] ?? 'none']++;
    }
  }
  const sumCounts = (counts: Record<Verdict | 'none', number>) =>
    Object.values(counts).reduce((sum, count) => sum + count, 0);
  const falsePositiveTotal = sumCounts(byLabel.false_positive);
  const truePositiveTotal = sumCounts(byLabel.true_positive);

  const failures = Object.entries(
    countBy(
      snapshot.workerExecutions.filter(
        ({ status }) => TERMINAL_STATUSES.has(status) && status !== 'completed'
      ),
      failureMessage
    )
  )
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);

  const inFlight = (byStatus: Record<string, number>) =>
    Object.entries(byStatus)
      .filter(([status]) => !TERMINAL_STATUSES.has(status))
      .reduce((sum, [, count]) => sum + count, 0);

  return {
    window: { startedAt: runStartedAt, endedAt: runEndedAt, wallClockMs },
    dispatch: {
      batches: dispatches.length,
      alerts: dispatches.reduce((sum, { alerts }) => sum + alerts.length, 0),
      failedBatches: dispatches.filter(({ executionId }) => !executionId).length,
      apiMs: distribution(
        dispatches.filter(({ executionId }) => executionId).map(({ runApiMs }) => runApiMs)
      ),
      indexMs: distribution(
        dispatches.filter(({ executionId }) => executionId).map(({ indexMs }) => indexMs)
      ),
    },
    batchesByPhase: countBy(progress, ({ phase }) => phase),
    workerExecutionsByStatus: countBy(snapshot.workerExecutions, ({ status }) => status),
    failures,
    latencyMs: {
      dispatchToStart: distribution(
        defined(
          progress.map(({ dispatch, execution }) =>
            diff(execution?.startedAt, dispatch.dispatchedAt)
          )
        )
      ),
      dispatchToTriaged: distribution(
        defined(
          triagedProgress.map(({ dispatch, workDoneStep }) =>
            diff(workDoneStep?.finishedAt, dispatch.dispatchedAt)
          )
        )
      ),
      startToTriaged: distribution(
        defined(
          triagedProgress.map(({ execution, workDoneStep }) =>
            diff(workDoneStep?.finishedAt, execution?.startedAt)
          )
        )
      ),
      steps: stepDistributions,
    },
    throughput: {
      alertsTriaged,
      alertsPerHourTriaged:
        wallClockMs > 0 ? round((alertsTriaged / wallClockMs) * 3_600_000) : undefined,
    },
    peaks: {
      inFlightWorkerExecutions: Math.max(
        0,
        ...samples.map((s) => inFlight(s.workerExecutionsByStatus))
      ),
      taskManagerDriftP99Ms: maxOf(samples.map((s) => s.taskManager?.driftP99Ms)),
      taskManagerOverdueTasks: maxOf(samples.map((s) => s.taskManager?.overdueTasks)),
      taskManagerLoadP50: maxOf(samples.map((s) => s.taskManager?.loadP50)),
    },
    childExecutions: Object.fromEntries(
      Object.entries(snapshot.childExecutions).map(([workflowId, executions]) => {
        const byStatus = countBy(executions, ({ status }) => status);
        return [workflowId, { byStatus, open: inFlight(byStatus) }];
      })
    ),
    accuracy: {
      alertsScored: falsePositiveTotal + truePositiveTotal,
      byLabel,
      falsePositiveRecall:
        falsePositiveTotal > 0
          ? round(byLabel.false_positive.false_positive / falsePositiveTotal, 3)
          : undefined,
      truePositiveMissedAsFalsePositive:
        truePositiveTotal > 0
          ? round(byLabel.true_positive.false_positive / truePositiveTotal, 3)
          : undefined,
    },
    tokenUsage: sumNumericFields([
      ...snapshot.workerExecutions.map(({ usage }) => usage),
      ...Object.values(snapshot.childExecutions).flatMap((executions) =>
        executions.map(({ usage }) => usage)
      ),
    ]),
  };
};

const formatDistribution = (d: Distribution | undefined): string =>
  d
    ? `n=${d.count} p50=${Math.round(d.p50)} p90=${Math.round(d.p90)} p95=${Math.round(
        d.p95
      )} p99=${Math.round(d.p99)} max=${Math.round(d.max)}`
    : 'no data';

const formatCounts = (counts: Record<string, number>): string =>
  Object.entries(counts)
    .map(([key, count]) => `${key}=${count}`)
    .join(', ') || 'none';

export const renderReportMarkdown = (report: Report): string => {
  const { dispatch, latencyMs, throughput, peaks, accuracy } = report;
  const lines = [
    '# Alert Triage load test summary',
    '',
    `Window: ${report.window.startedAt} -> ${report.window.endedAt} (${Math.round(
      report.window.wallClockMs / 1000
    )}s)`,
    '',
    '## Dispatch',
    `- Batches: ${dispatch.batches} (${dispatch.failedBatches} failed to dispatch), alerts: ${dispatch.alerts}`,
    `- Run API latency (ms): ${formatDistribution(dispatch.apiMs)}`,
    `- Alert indexing latency (ms): ${formatDistribution(dispatch.indexMs)}`,
    `- Batches by phase: ${formatCounts(report.batchesByPhase)}`,
    `- Worker executions by status: ${formatCounts(report.workerExecutionsByStatus)}`,
    '',
    '## Latency (ms)',
    `- Dispatch to execution start: ${formatDistribution(latencyMs.dispatchToStart)}`,
    `- Dispatch to triaged: ${formatDistribution(latencyMs.dispatchToTriaged)}`,
    `- Start to triaged: ${formatDistribution(latencyMs.startToTriaged)}`,
    ...Object.entries(latencyMs.steps).map(
      ([stepId, stat]) => `- Step \`${stepId}\`: ${formatDistribution(stat)}`
    ),
    '',
    '## Throughput and saturation',
    `- Alerts triaged: ${throughput.alertsTriaged} (${
      throughput.alertsPerHourTriaged ?? 'n/a'
    } per hour over the window)`,
    `- Peak in-flight Worker executions: ${peaks.inFlightWorkerExecutions}`,
    `- Peak Task Manager drift p99 (ms): ${peaks.taskManagerDriftP99Ms ?? 'n/a'}`,
    `- Peak overdue tasks: ${peaks.taskManagerOverdueTasks ?? 'n/a'}`,
    `- Peak Task Manager load p50: ${peaks.taskManagerLoadP50 ?? 'n/a'}`,
    ...Object.entries(report.childExecutions).map(
      ([workflowId, { byStatus, open }]) =>
        `- \`${workflowId}\`: ${formatCounts(byStatus)} (${open} still open)`
    ),
    '',
    '## Accuracy (triaged alerts only)',
    `- Alerts scored: ${accuracy.alertsScored}`,
    `- False positives tagged false positive: ${accuracy.falsePositiveRecall ?? 'n/a'}`,
    `- True positives wrongly tagged false positive: ${
      accuracy.truePositiveMissedAsFalsePositive ?? 'n/a'
    }`,
    `- Ground truth false_positive -> ${formatCounts(accuracy.byLabel.false_positive)}`,
    `- Ground truth true_positive -> ${formatCounts(accuracy.byLabel.true_positive)}`,
    '',
    '## Token usage (sum over Worker and child executions)',
    `- ${formatCounts(report.tokenUsage)}`,
    '',
    '## Failures',
    ...(report.failures.length > 0
      ? report.failures.map(({ message, count }) => `- ${count} x ${message}`)
      : ['- none']),
    '',
  ];
  return lines.join('\n');
};
