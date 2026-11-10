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
  const sampledGroupHash = '00000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const unsampledGroupHash = 'ffffffffaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const sampledRuleFingerprint = '179390612a7be955ea2ffeae24130e6019fae04ec7b316c4b2256e82ab4ade7b';

  it('reports sampled episodes and classifies them by rule presence', () => {
    const telemetry = { reportAlertEnteredPipeline: jest.fn() };

    reportAlertsEnteredPipeline(
      [
        {
          spaceId: 'space-a',
          source: 'datadog',
          alert: { groupHash: sampledGroupHash, status: 'pending', previousStatus: null },
          rule: null,
        },
        {
          spaceId: 'space-b',
          source: 'internal',
          alert: { groupHash: 'group-hash', status: 'active', previousStatus: 'inactive' },
          rule: { id: 'rule-25' },
        },
        {
          spaceId: 'space-c',
          source: 'internal',
          alert: { groupHash: sampledGroupHash, status: 'active', previousStatus: null },
          rule: null,
        },
      ],
      telemetry
    );

    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(1, {
      alert_source: 'datadog',
      fingerprint: sampledGroupHash,
      space_id: 'space-a',
      source_kind: 'external',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(2, {
      alert_source: 'internal',
      fingerprint: sampledRuleFingerprint,
      space_id: 'space-b',
      source_kind: 'elastic_configured',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(3, {
      alert_source: 'internal',
      fingerprint: sampledGroupHash,
      space_id: 'space-c',
      source_kind: 'external',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
  });

  it('ignores non-entry transitions, Significant Events, and dropped samples', () => {
    const telemetry = { reportAlertEnteredPipeline: jest.fn() };

    reportAlertsEnteredPipeline(
      [
        {
          spaceId: 'default',
          source: 'datadog',
          alert: { groupHash: sampledGroupHash, status: 'active', previousStatus: 'pending' },
          rule: null,
        },
        {
          spaceId: 'default',
          source: 'elastic.significant_events',
          alert: { groupHash: sampledGroupHash, status: 'pending', previousStatus: null },
          rule: null,
        },
        {
          spaceId: 'default',
          source: 'pagerduty',
          alert: { groupHash: unsampledGroupHash, status: 'active', previousStatus: null },
          rule: null,
        },
      ],
      telemetry
    );

    expect(telemetry.reportAlertEnteredPipeline).not.toHaveBeenCalled();
  });
});
