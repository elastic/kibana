/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils';
import { AnomalyDetectorType } from '@kbn/response-ops-rule-params/apm_anomaly/latest';
import { Duration } from '@kbn/slo-schema';

export const ROLES = {
  rules_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          slo: ['read'],
          uptime: ['read'],
          apm: ['read'],
          observabilityManageRules: ['all'],
        },
      },
    ],
  },
  plugins_all: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          slo: ['all'],
          uptime: ['all'],
          apm: ['all'],
          observabilityManageRules: ['read'],
        },
      },
    ],
  },
  rules_read_only: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        base: [],
        spaces: ['*'],
        feature: {
          observabilityManageRules: ['read'],
        },
      },
    ],
  },
};

export const syntheticsRule = {
  name: 'Synthetics monitor status rule',
  enabled: true,
  consumer: 'alerts',
  tags: [],
  params: {
    condition: {
      window: { numberOfChecks: 5 },
      groupBy: 'locationId',
      downThreshold: 3,
      locationsThreshold: 1,
    },
  },
  schedule: { interval: '1m' },
  ruleTypeId: 'xpack.synthetics.alerts.monitorStatus',
  actions: [],
  alert_delay: { active: 1 },
};

export const apmRule = {
  name: 'APM Anomaly rule',
  enabled: true,
  consumer: 'alerts',
  tags: [],
  params: {
    windowSize: 30,
    windowUnit: 'm',
    anomalySeverityType: 'critical' as ML_ANOMALY_SEVERITY.CRITICAL,
    anomalyDetectorTypes: ['txLatency', 'txThroughput', 'txFailureRate'] as AnomalyDetectorType[],
    environment: 'ENVIRONMENT_ALL',
  },
  schedule: { interval: '1m' },
  ruleTypeId: 'apm.anomaly',
  actions: [],
  alert_delay: { active: 1 },
};

export const sloRule = {
  name: 'SLO burn rate rule',
  enabled: true,
  consumer: 'alerts',
  tags: [],
  params: {
    windows: [
      {
        id: '8568e212-0b38-4fc7-8fbd-dc70e277c3aa',
        burnRateThreshold: 14.4,
        maxBurnRateThreshold: 720,
        longWindow: { value: 1, unit: 'h' } as Duration,
        shortWindow: { value: 5, unit: 'm' } as Duration,
        actionGroup: 'slo.burnRate.alert',
      },
      {
        id: 'bbc920ce-6fa6-4b0c-9c32-10e25724eb7b',
        burnRateThreshold: 6,
        maxBurnRateThreshold: 120,
        longWindow: { value: 6, unit: 'h' } as Duration,
        shortWindow: { value: 30, unit: 'm' } as Duration,
        actionGroup: 'slo.burnRate.high',
      },
      {
        id: '03b0d6ae-f57d-4743-9b6e-a30329f84cb4',
        burnRateThreshold: 3,
        maxBurnRateThreshold: 30,
        longWindow: { value: 24, unit: 'h' } as Duration,
        shortWindow: { value: 120, unit: 'm' } as Duration,
        actionGroup: 'slo.burnRate.medium',
      },
      {
        id: '4aa82db2-8dab-45e5-bdbe-97bf77b9d2a2',
        burnRateThreshold: 1,
        maxBurnRateThreshold: 10,
        longWindow: { value: 72, unit: 'h' } as Duration,
        shortWindow: { value: 360, unit: 'm' } as Duration,
        actionGroup: 'slo.burnRate.low',
      },
    ],
    dependencies: [],
    sloId: '563a4518-38df-421b-adf1-1e907da7da8d',
  },
  schedule: { interval: '1m' },
  ruleTypeId: 'slo.rules.burnRate',
  actions: [],
  alert_delay: { active: 1 },
};
