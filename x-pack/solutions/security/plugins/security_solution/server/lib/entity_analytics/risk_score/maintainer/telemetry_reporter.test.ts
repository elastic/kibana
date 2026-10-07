/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT } from '../../../telemetry/event_based/events';
import { createRiskScoreMaintainerTelemetryReporter } from './telemetry_reporter';

describe('createRiskScoreMaintainerTelemetryReporter', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sums base, resolution, and reset-to-zero counters into scoresWrittenTotal', () => {
    const reporter = createRiskScoreMaintainerTelemetryReporter({
      telemetry: { reportEvent } as unknown as AnalyticsServiceSetup,
    });

    reporter
      .forRun({ namespace: 'default', entityType: 'host', idBasedRiskScoringEnabled: true })
      .completionSummary({
        runStatus: 'success',
        scoresWrittenBase: 3,
        scoresWrittenResolution: 2,
        scoresWrittenResetToZero: 1,
        pagesProcessed: 4,
        lookupPrunedDocs: 9,
      });

    expect(reportEvent).toHaveBeenCalledWith(
      RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType,
      expect.objectContaining({ scoresWrittenTotal: 6 })
    );
    expect(reportEvent.mock.calls[0][1]).not.toHaveProperty('baseScoreDistribution');
    expect(reportEvent.mock.calls[0][1]).not.toHaveProperty('resolutionScoreDistribution');
  });

  it('adds base and resolution risk score distributions to the completion summary', () => {
    const reporter = createRiskScoreMaintainerTelemetryReporter({
      telemetry: { reportEvent } as unknown as AnalyticsServiceSetup,
    });

    reporter
      .forRun({ namespace: 'default', entityType: 'host', idBasedRiskScoringEnabled: true })
      .completionSummary({
        runStatus: 'success',
        scoresWrittenBase: 1,
        scoresWrittenResolution: 0,
        scoresWrittenResetToZero: 0,
        pagesProcessed: 1,
        lookupPrunedDocs: 0,
        baseScoreDistribution: {
          Critical: 1,
          High: 2,
          Moderate: 3,
          Low: 4,
          Unknown: 5,
          normP50: 40,
          normP90: 90,
        },
        resolutionScoreDistribution: {
          Critical: 6,
          High: 0,
          Moderate: 1,
          Low: 0,
          Unknown: 0,
          normP50: 12,
          normP90: 70,
        },
      });

    expect(reportEvent).toHaveBeenCalledWith(
      RISK_SCORE_MAINTAINER_RUN_SUMMARY_EVENT.eventType,
      expect.objectContaining({
        baseScoreDistribution: {
          critical: 1,
          high: 2,
          moderate: 3,
          low: 4,
          unknown: 5,
          normP50: 40,
          normP90: 90,
        },
        resolutionScoreDistribution: {
          critical: 6,
          high: 0,
          moderate: 1,
          low: 0,
          unknown: 0,
          normP50: 12,
          normP90: 70,
        },
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
        lookupPrunedDocs: 0,
      })
    );
    expect(reportEvent.mock.calls[0][1]).not.toHaveProperty('baseScoreDistribution');
    expect(reportEvent.mock.calls[0][1]).not.toHaveProperty('resolutionScoreDistribution');
  });
});
