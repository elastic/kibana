/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import {
  RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT,
  RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT,
} from '../../../telemetry/event_based/events';
import { createRiskScoreMaintainerTelemetryReporter } from './telemetry_reporter';

describe('createRiskScoreMaintainerTelemetryReporter', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports run completion with resolution and lookup counters', () => {
    const reporter = createRiskScoreMaintainerTelemetryReporter({
      telemetry: { reportEvent } as unknown as AnalyticsServiceSetup,
    });

    const runTelemetry = reporter.forRun({
      namespace: 'default',
      entityType: 'host',
      idBasedRiskScoringEnabled: true,
    });

    runTelemetry.completionSummary({
      runStatus: 'success',
      scoresWrittenBase: 3,
      scoresWrittenResolution: 2,
      scoresWrittenResetToZero: 1,
      pagesProcessed: 4,
      deferToPhase2Count: 5,
      notInStoreCount: 6,
      lookupDocsUpserted: 7,
      lookupDocsDeleted: 8,
      lookupPrunedDocs: 9,
    });

    expect(reportEvent).toHaveBeenCalledWith(
      RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType,
      expect.objectContaining({
        namespace: 'default',
        entityType: 'host',
        status: 'success',
        scoresWrittenTotal: 6,
        scoresWrittenBase: 3,
        scoresWrittenResolution: 2,
        scoresWrittenResetToZero: 1,
        lookupDocsUpserted: 7,
        lookupDocsDeleted: 8,
        lookupPrunedDocs: 9,
      })
    );
  });

  it('reports lookup sync success and resolution skipped stages', () => {
    const reporter = createRiskScoreMaintainerTelemetryReporter({
      telemetry: { reportEvent } as unknown as AnalyticsServiceSetup,
    });

    const runTelemetry = reporter.forRun({
      namespace: 'default',
      entityType: 'user',
      idBasedRiskScoringEnabled: false,
    });

    runTelemetry.startLookupSyncStage().success({
      lookupDocsUpserted: 2,
      lookupDocsDeleted: 1,
    });
    runTelemetry.startResolutionStage().skipped('lookup_empty');

    expect(reportEvent).toHaveBeenNthCalledWith(
      1,
      RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT.eventType,
      expect.objectContaining({
        namespace: 'default',
        entityType: 'user',
        stage: 'phase1_lookup_sync',
        status: 'success',
        lookupDocsUpserted: 2,
        lookupDocsDeleted: 1,
        durationMs: expect.any(Number),
      })
    );

    expect(reportEvent).toHaveBeenNthCalledWith(
      2,
      RISK_SCORE_MAINTAINER_STAGE_SUMMARY_EVENT.eventType,
      expect.objectContaining({
        namespace: 'default',
        entityType: 'user',
        stage: 'phase2_resolution_scoring',
        status: 'skipped',
        skipReason: 'lookup_empty',
        durationMs: expect.any(Number),
      })
    );
  });

  it('deduplicates repeated global skip reports for the same reason', () => {
    const reporter = createRiskScoreMaintainerTelemetryReporter({
      telemetry: { reportEvent } as unknown as AnalyticsServiceSetup,
    });

    reporter.reportGlobalSkipIfChanged({
      namespace: 'default',
      skipReason: 'feature_disabled',
      idBasedRiskScoringEnabled: false,
    });
    reporter.reportGlobalSkipIfChanged({
      namespace: 'default',
      skipReason: 'feature_disabled',
      idBasedRiskScoringEnabled: false,
    });

    expect(reportEvent).toHaveBeenCalledTimes(1);
    expect(reportEvent).toHaveBeenCalledWith(
      RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType,
      expect.objectContaining({
        status: 'skipped',
        skipReason: 'feature_disabled',
        scoresWrittenResolution: 0,
        lookupDocsUpserted: 0,
        lookupDocsDeleted: 0,
        lookupPrunedDocs: 0,
      })
    );
  });
});
