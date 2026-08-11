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
  });
});
