/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';
import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import type { RegisterEntityMaintainerConfig } from '@kbn/entity-store/server';
import { RISK_SCORE_PERFORMANCE_EVENT } from './events';
import type { RiskScorePerformanceEvent } from './events';
import { createPageStepTimings } from './page_step_timings';
import type {
  PageProfilingOptions,
  PageStepTimings,
  PageStepTimingsSummary,
} from './page_timing_types';
import { pageTimingMeasurements, runHealthMeasurements } from './performance_measurements';
import type { RunHealthSummary } from './run_health';
import { riskScoreLogMeta } from './risk_score_log_meta';
import { buildRiskScoreTaskEvent } from './task_event';

type TaskContext = Parameters<RegisterEntityMaintainerConfig['run']>[0];
type StageSummary = Pick<
  RiskScorePerformanceEvent,
  'entityType' | 'stage' | 'status' | 'durationMs'
>;

/** Connects risk-score observations to logs, performance telemetry and scheduled task events. */
export const createRunInstrumentation = ({
  logger,
  telemetry,
  calculationRunId,
  namespace,
  setCustomTaskRunEventFields,
}: {
  logger: Logger;
  telemetry: AnalyticsServiceSetup;
  calculationRunId: string;
  namespace: string;
  setCustomTaskRunEventFields?: TaskContext['setCustomTaskRunEventFields'];
}) => {
  const identity = { calculationRunId, namespace };
  const stages: StageSummary[] = [];
  const startedAt = performance.now();
  const updateTaskEvent = (
    status: RiskScorePerformanceEvent['status'] | 'running' = 'running',
    durationMs = performance.now() - startedAt
  ) => {
    setCustomTaskRunEventFields?.(
      buildRiskScoreTaskEvent(calculationRunId, status, durationMs, stages)
    );
  };
  updateTaskEvent();

  const reportStage = (
    stage: StageSummary,
    measurements: RiskScorePerformanceEvent['measurements'] = []
  ) => {
    stages.push(stage);
    updateTaskEvent();
    telemetry.reportEvent(RISK_SCORE_PERFORMANCE_EVENT.eventType, {
      ...identity,
      ...stage,
      measurements,
    });
  };
  return {
    createPageTimings: (
      entityType: string,
      stage: 'base' | 'resolution',
      options: PageProfilingOptions
    ) =>
      createPageStepTimings({
        ...options,
        onPage: (page) =>
          logger.info(
            'Risk score page timings',
            riskScoreLogMeta({ ...identity, entityType, stage, ...page })
          ),
        onProfile: (page, profile) =>
          logger.info(
            'Risk score ES|QL page profile',
            riskScoreLogMeta({ ...identity, entityType, stage, page, profile })
          ),
      }),
    finishStage: (stage: StageSummary, pageTimings: PageStepTimings): PageStepTimingsSummary => {
      const timing = pageTimings.summary();
      logger.info('Risk score stage timings', riskScoreLogMeta({ ...identity, ...stage, timing }));
      reportStage(stage, pageTimingMeasurements(timing));
      return timing;
    },
    reportStage,
    finishRun: (health: RunHealthSummary, status: RiskScorePerformanceEvent['status']) => {
      logger.info(
        'Risk score maintainer process health',
        riskScoreLogMeta({ ...identity, status, processHealth: health })
      );
      telemetry.reportEvent(RISK_SCORE_PERFORMANCE_EVENT.eventType, {
        ...identity,
        stage: 'process',
        status,
        durationMs: health.durationMs,
        measurements: runHealthMeasurements(health),
      });
      updateTaskEvent(status, health.durationMs);
    },
  };
};

export type RunInstrumentation = ReturnType<typeof createRunInstrumentation>;
