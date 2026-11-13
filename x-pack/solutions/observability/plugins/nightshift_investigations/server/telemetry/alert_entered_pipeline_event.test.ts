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
  const sampledGroupHash = 'group-hash-18';
  const unsampledGroupHash = 'group-hash-0';
  const sampledDatadogFingerprint =
    '15339e8beca53c6b5b83e1734bea8f39076e1f8c16833432cb96c12d2336c298';
  const sampledInternalFingerprint =
    '011eb8d572d746741b7020501dd970ab5c4371c49499ebebfec6055fa91a9f56';
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
      fingerprint: sampledDatadogFingerprint,
      group_hash: sampledGroupHash,
      space_id: 'space-a',
      source_kind: 'external',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(2, {
      alert_source: 'internal',
      fingerprint: sampledRuleFingerprint,
      group_hash: 'group-hash',
      space_id: 'space-b',
      source_kind: 'elastic_configured',
      sampling_probability: ALERT_ENTERED_PIPELINE_SAMPLING_PROBABILITY,
    });
    expect(telemetry.reportAlertEnteredPipeline).toHaveBeenNthCalledWith(3, {
      alert_source: 'internal',
      fingerprint: sampledInternalFingerprint,
      group_hash: sampledGroupHash,
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
