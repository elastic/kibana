/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
  reportAlertsEnteredPipeline,
} from './alert_entered_pipeline_event';

describe('alert entered pipeline telemetry', () => {
  const sampledFingerprint = '00000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const unsampledFingerprint = 'ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  it('reports sampled external and Elastic-configured episodes', () => {
    const telemetry = { reportAlertEnteredPipeline: jest.fn() };

    reportAlertsEnteredPipeline(
      [
        {
          spaceId: 'space-a',
          source: 'datadog',
          alert: {
            fingerprint: sampledFingerprint,
            status: 'pending',
            previousStatus: null,
          },
        },
        {
          spaceId: 'space-b',
          source: 'internal',
          alert: {
            fingerprint: sampledFingerprint,
            status: 'active',
            previousStatus: 'inactive',
          },
        },
      ],
      telemetry
    );

    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(1, {
      alert_source: 'datadog',
      fingerprint: sampledFingerprint,
      space_id: 'space-a',
      source_kind: 'external',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(2, {
      alert_source: 'internal',
      fingerprint: sampledFingerprint,
      space_id: 'space-b',
      source_kind: 'elastic_configured',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
  });

  it('ignores non-entry transitions, Significant Events, missing fingerprints, and dropped samples', () => {
    const telemetry = { reportAlertEnteredPipeline: jest.fn() };

    reportAlertsEnteredPipeline(
      [
        {
          spaceId: 'default',
          source: 'datadog',
          alert: {
            fingerprint: sampledFingerprint,
            status: 'active',
            previousStatus: 'pending',
          },
        },
        {
          spaceId: 'default',
          source: 'elastic.significant_events',
          alert: {
            fingerprint: sampledFingerprint,
            status: 'pending',
            previousStatus: null,
          },
        },
        {
          spaceId: 'default',
          source: 'internal',
          alert: { status: 'pending', previousStatus: null },
        },
        {
          spaceId: 'default',
          source: 'pagerduty',
          alert: {
            fingerprint: unsampledFingerprint,
            status: 'active',
            previousStatus: null,
          },
        },
      ],
      telemetry
    );

    expect(telemetry.reportAlertEnteredPipeline).not.toHaveBeenCalled();
  });
});
