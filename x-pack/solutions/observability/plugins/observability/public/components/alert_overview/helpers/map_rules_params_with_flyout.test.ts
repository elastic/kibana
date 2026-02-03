/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TopAlert } from '../../../typings/alerts';
import { mapRuleParamsWithFlyout } from './map_rules_params_with_flyout';

describe('Map rules params with flyout', () => {
  const testData = [
    {
      ruleType: 'observability.rules.custom_threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                comparator: '>',
                metrics: [
                  {
                    name: 'A',
                    field: 'system.memory.usage',
                    aggType: 'avg',
                  },
                ],
                threshold: [1000000000],
                timeSize: 1,
                timeUnit: 'm',
              },
            ],
            alertOnNoData: true,
            alertOnGroupDisappear: true,
            searchConfiguration: {
              query: {
                query: '',
                language: 'kuery',
              },
              index: 'apm_static_data_view_id_default',
            },
          },
          'kibana.alert.evaluation.threshold': 1000000000,
          'kibana.alert.evaluation.values': [1347892565.33],
        },
      },
      results: [
        {
          observedValue: '1,347,892,565.33',
          threshold: '1,000,000,000',
          comparator: '>',
          pctAboveThreshold: ' (34.79% above the threshold)',
        },
      ],
    },
    {
      ruleType: '.es-query',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': '.es-query',
          'kibana.alert.rule.parameters': {
            searchConfiguration: {
              query: {
                language: 'kuery',
                query: '',
              },
              index: 'apm_static_data_view_id_default',
            },
            timeField: '@timestamp',
            searchType: 'searchSource',
            timeWindowSize: 5,
            timeWindowUnit: 'm',
            threshold: [1],
            thresholdComparator: '>',
            size: 100,
            aggType: 'avg',
            aggField: 'system.disk.io',
            groupBy: 'all',
            termSize: 5,
            sourceFields: [
              {
                label: 'container.id',
                searchPath: 'container.id',
              },
              {
                label: 'host.hostname',
                searchPath: 'host.hostname',
              },
              {
                label: 'host.id',
                searchPath: 'host.id',
              },
              {
                label: 'host.name',
                searchPath: 'host.name',
              },
              {
                label: 'kubernetes.pod.uid',
                searchPath: 'kubernetes.pod.uid',
              },
            ],
            excludeHitsFromPreviousRun: false,
          },
          'kibana.alert.evaluation.value': 100870655162.18182,
          'kibana.alert.evaluation.threshold': [1],
        },
      },
      results: [
        {
          observedValue: [100870655162.18182],
          threshold: '1',
          comparator: '>',
          pctAboveThreshold: ' (10087065516118.18% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'logs.alert.document.count',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'logs.alert.document.count',
          'kibana.alert.rule.parameters': {
            timeSize: 5,
            timeUnit: 'm',
            logView: {
              type: 'log-view-reference',
              logViewId: 'default',
            },
            count: {
              value: 100,
              comparator: 'more than',
            },
            criteria: [
              {
                field: 'host.name',
                comparator: 'does not equal',
                value: 'test',
              },
            ],
            groupBy: ['host.name'],
          },
          'kibana.alert.evaluation.value': 4577,
          'kibana.alert.evaluation.threshold': 100,
        },
      },
      results: [
        {
          observedValue: [4577],
          threshold: [100],
          comparator: 'more than',
          pctAboveThreshold: ' (4477% more than the threshold)',
        },
      ],
    },
    {
      ruleType: 'metrics.alert.threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.01],
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.process.cpu.total.pct',
              },
            ],
          },
          'kibana.alert.evaluation.value': [0.06],
          'kibana.alert.evaluation.threshold': 0.01,
        },
      },
      results: [
        {
          observedValue: '6%',
          threshold: '1%',
          comparator: '>',
          pctAboveThreshold: ' (500% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'metrics.alert.inventory.threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
          'kibana.alert.rule.parameters': {
            nodeType: 'host',
            criteria: [
              {
                metric: 'rx',
                comparator: '>',
                threshold: [3000000],
                timeSize: 1,
                timeUnit: 'm',
                customMetric: {
                  type: 'custom',
                  id: 'alert-custom-metric',
                  field: '',
                  aggregation: 'avg',
                },
              },
            ],
            sourceId: 'default',
          },

          'kibana.alert.evaluation.value': [1303266.4],
          'kibana.alert.evaluation.threshold': 3000000,
        },
      },
      results: [
        {
          observedValue: '10.4 Mbit',
          threshold: '3 Mbit',
          comparator: '>',
          pctAboveThreshold: ' (247.54% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'metrics.alert.inventory.threshold',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
          'kibana.alert.rule.parameters': {
            nodeType: 'host',
            criteria: [
              {
                metric: 'rx',
                comparator: '<',
                threshold: [90],
                timeSize: 1,
                timeUnit: 'm',
                customMetric: {
                  type: 'custom',
                  id: 'alert-custom-metric',
                  field: 'system.memory.used.pct',
                  aggregation: 'avg',
                },
              },
            ],
            sourceId: 'default',
          },

          'kibana.alert.evaluation.value': [130.4],
          'kibana.alert.evaluation.threshold': 3000000,
        },
      },
      results: [
        {
          comparator: '<',
          observedValue: '13,040%',
          pctAboveThreshold: ' (14388.89% below the threshold)',
          threshold: '9,000%',
        },
      ],
    },
    {
      ruleType: 'apm.error_rate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.error_rate',
          'kibana.alert.rule.parameters': {
            threshold: 1,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },

          'kibana.alert.evaluation.value': 1,
          'kibana.alert.evaluation.threshold': 1,
        },
      },
      results: [
        {
          observedValue: [1],
          threshold: [1],
          comparator: '>',
          pctAboveThreshold: ' (0% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'apm.transaction_duration',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.transaction_duration',
          'kibana.alert.rule.parameters': {
            aggregationType: 'avg',
            threshold: 1500,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          'kibana.alert.evaluation.value': 22872063,
          'kibana.alert.evaluation.threshold': 1500000,
        },
      },
      results: [
        {
          observedValue: ['23 s'],
          threshold: ['1.5 s'],
          comparator: '>',
          pctAboveThreshold: ' (1424.8% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'apm.transaction_error_rate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'apm.transaction_error_rate',
          'kibana.alert.rule.parameters': {
            threshold: 1,
            windowSize: 5,
            windowUnit: 'm',
            environment: 'ENVIRONMENT_ALL',
          },
          'kibana.alert.evaluation.value': 25,
          'kibana.alert.evaluation.threshold': 1,
        },
      },
      results: [
        {
          observedValue: ['25%'],
          threshold: ['1.0%'],
          comparator: '>',
          pctAboveThreshold: ' (2400% above the threshold)',
        },
      ],
    },
    {
      ruleType: 'slo.rules.burnRate',
      alert: {
        fields: {
          'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
          'kibana.alert.evaluation.value': 66.02,
          'kibana.alert.evaluation.threshold': 0.07,
          'kibana.alert.rule.parameters': {
            windows: [
              {
                id: 'adf3db9b-7362-4941-8433-f6c285b1226a',
                burnRateThreshold: 0.07200000000000001,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: 'cff3b7d1-741b-42ca-882c-a4a39084c503',
                burnRateThreshold: 4.4639999999999995,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: '5be0fc9b-1376-48bd-b583-117a5472759a',
                burnRateThreshold: 7.127999999999999,
                maxBurnRateThreshold: 720,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
              {
                id: '17b6002a-806f-415b-839c-66aea0f76da6',
                burnRateThreshold: 0.1,
                maxBurnRateThreshold: 10,
                longWindow: {
                  value: 1,
                  unit: 'h',
                },
                shortWindow: {
                  value: 5,
                  unit: 'm',
                },
                actionGroup: 'slo.burnRate.low',
              },
            ],
            sloId: 'd463f5cf-e1d8-4a2b-ab5d-e750625e4599',
          },
        },
      },
      results: [
        {
          observedValue: [66.02],
          threshold: [0.07],
          comparator: '>',
          pctAboveThreshold: ' (94214.29% above the threshold)',
        },
      ],
    },
  ];

  it.each(testData)(
    'Map rules type ($ruleType) with the alert flyout is OK',
    ({ alert, results }) => {
      expect(mapRuleParamsWithFlyout(alert as unknown as TopAlert)).toMatchObject(results);
    }
  );

  describe('Warning thresholds', () => {
    describe('METRIC_THRESHOLD_ALERT_TYPE_ID', () => {
      it('should include warningThreshold and warningComparator when provided', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'avg',
                  comparator: '>',
                  threshold: [0.8],
                  warningThreshold: [0.5],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  metric: 'system.process.cpu.total.pct',
                },
              ],
            },
            'kibana.alert.evaluation.value': [0.95],
            'kibana.alert.evaluation.threshold': 0.8,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result).toMatchObject([
          {
            observedValue: '95%',
            threshold: '80%',
            comparator: '>',
            warningThreshold: '50%',
            warningComparator: '>',
          },
        ]);
      });

      it('should not include warningThreshold when only warningComparator is provided', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'avg',
                  comparator: '>',
                  threshold: [0.8],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  metric: 'system.process.cpu.total.pct',
                },
              ],
            },
            'kibana.alert.evaluation.value': [0.95],
            'kibana.alert.evaluation.threshold': 0.8,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0]).not.toHaveProperty('warningThreshold');
        expect(result?.[0]).not.toHaveProperty('warningComparator');
      });

      it('should handle warningThreshold with customMetrics', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'custom',
                  comparator: '>',
                  threshold: [1000000],
                  warningThreshold: [500000],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetrics: [
                    {
                      name: 'A',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                  ],
                },
              ],
            },
            'kibana.alert.evaluation.value': [2000000],
            'kibana.alert.evaluation.threshold': 1000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result).toMatchObject([
          {
            observedValue: expect.any(String),
            threshold: expect.any(String),
            comparator: '>',
            warningThreshold: expect.any(String),
            warningComparator: '>',
          },
        ]);
        expect(result?.[0].warningThreshold).toBeTruthy();
      });
    });

    describe('METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID', () => {
      it('should include warningThreshold and warningComparator with customMetric.field', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
            'kibana.alert.rule.parameters': {
              nodeType: 'host',
              criteria: [
                {
                  metric: 'cpu',
                  comparator: '>',
                  threshold: [80],
                  warningThreshold: [60],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetric: {
                    type: 'custom',
                    id: 'alert-custom-metric',
                    field: 'system.cpu.user.pct',
                    aggregation: 'avg',
                  },
                },
              ],
              sourceId: 'default',
            },
            'kibana.alert.evaluation.value': [90],
            'kibana.alert.evaluation.threshold': 80,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result).toMatchObject([
          {
            observedValue: expect.any(String),
            threshold: expect.any(String),
            comparator: '>',
            warningThreshold: expect.any(String),
            warningComparator: '>',
            pctAboveThreshold: expect.any(String),
          },
        ]);
        expect(result?.[0].warningThreshold).toBeTruthy();
        expect(result?.[0].warningComparator).toBe('>');
      });

      it('should include warningThreshold and warningComparator without customMetric.field (using formatter)', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
            'kibana.alert.rule.parameters': {
              nodeType: 'host',
              criteria: [
                {
                  metric: 'rx',
                  comparator: '>',
                  threshold: [3000000],
                  warningThreshold: [2000000],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetric: {
                    type: 'custom',
                    id: 'alert-custom-metric',
                    field: '',
                    aggregation: 'avg',
                  },
                },
              ],
              sourceId: 'default',
            },
            'kibana.alert.evaluation.value': [4000000],
            'kibana.alert.evaluation.threshold': 3000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result).toMatchObject([
          {
            observedValue: expect.any(String),
            threshold: expect.any(String),
            comparator: '>',
            warningThreshold: expect.any(String),
            warningComparator: '>',
            pctAboveThreshold: expect.any(String),
          },
        ]);
        // Warning threshold should be formatted using the same formatter as critical threshold
        expect(result?.[0].warningThreshold).toBeTruthy();
        expect(result?.[0].warningThreshold).toContain('Mbit'); // Should be formatted as bits
      });

      it('should not include warningThreshold when only warningComparator is provided', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
            'kibana.alert.rule.parameters': {
              nodeType: 'host',
              criteria: [
                {
                  metric: 'cpu',
                  comparator: '>',
                  threshold: [80],
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetric: {
                    type: 'custom',
                    id: 'alert-custom-metric',
                    field: 'system.cpu.user.pct',
                    aggregation: 'avg',
                  },
                },
              ],
              sourceId: 'default',
            },
            'kibana.alert.evaluation.value': [90],
            'kibana.alert.evaluation.threshold': 80,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0]).not.toHaveProperty('warningThreshold');
        expect(result?.[0]).not.toHaveProperty('warningComparator');
      });

      it('should handle warningThreshold with percent metric type', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.inventory.threshold',
            'kibana.alert.rule.parameters': {
              nodeType: 'host',
              criteria: [
                {
                  metric: 'cpu',
                  comparator: '>',
                  threshold: [8000], // 80% stored as 8000
                  warningThreshold: [6000], // 60% stored as 6000
                  warningComparator: '>',
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetric: {
                    type: 'custom',
                    id: 'alert-custom-metric',
                    field: '',
                    aggregation: 'avg',
                  },
                },
              ],
              sourceId: 'default',
            },
            'kibana.alert.evaluation.value': [9000], // 90% stored as 9000
            'kibana.alert.evaluation.threshold': 8000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].warningThreshold).toBeTruthy();
        // The threshold should be converted from 6000 (60%) to 60 and formatted
        expect(result?.[0].warningThreshold).toContain('%');
      });
    });
  });

  describe('isFieldsSameType logic', () => {
    describe('OBSERVABILITY_THRESHOLD_RULE_TYPE_ID', () => {
      it('should use first field type when all metrics have same field type', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  comparator: '>',
                  metrics: [
                    {
                      name: 'A',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                    {
                      name: 'B',
                      field: 'system.memory.free.bytes',
                      aggType: 'avg',
                    },
                  ],
                  threshold: [1000000000],
                  timeSize: 1,
                  timeUnit: 'm',
                },
              ],
            },
            'kibana.alert.evaluation.values': [1500000000],
            'kibana.alert.evaluation.threshold': 1000000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].threshold).toBeTruthy();
        // Both fields end with .bytes, so they should use the same formatting
        expect(result?.[0].observedValue).toContain('B'); // Should be formatted as bytes
      });

      it('should use noType when metrics have different field types', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  comparator: '>',
                  metrics: [
                    {
                      name: 'A',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                    {
                      name: 'B',
                      field: 'system.cpu.user.pct',
                      aggType: 'avg',
                    },
                  ],
                  threshold: [1000000000],
                  timeSize: 1,
                  timeUnit: 'm',
                },
              ],
            },
            'kibana.alert.evaluation.values': [1500000000],
            'kibana.alert.evaluation.threshold': 1000000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].threshold).toBeTruthy();
        // Different field types should use 'noType' formatting
      });

      it('should handle COUNT_AGG fields correctly', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'observability.rules.custom_threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  comparator: '>',
                  metrics: [
                    {
                      name: 'A',
                      aggType: 'count',
                    },
                    {
                      name: 'B',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                  ],
                  threshold: [100],
                  timeSize: 1,
                  timeUnit: 'm',
                },
              ],
            },
            'kibana.alert.evaluation.values': [150],
            'kibana.alert.evaluation.threshold': 100,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].threshold).toBeTruthy();
      });
    });

    describe('METRIC_THRESHOLD_ALERT_TYPE_ID', () => {
      it('should use first field type when all customMetrics have same field type', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'custom',
                  comparator: '>',
                  threshold: [1000000],
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetrics: [
                    {
                      name: 'A',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                    {
                      name: 'B',
                      field: 'system.memory.free.bytes',
                      aggType: 'avg',
                    },
                  ],
                },
              ],
            },
            'kibana.alert.evaluation.value': [2000000],
            'kibana.alert.evaluation.threshold': 1000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].threshold).toBeTruthy();
      });

      it('should use noType when customMetrics have different field types', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'custom',
                  comparator: '>',
                  threshold: [1000000],
                  timeSize: 1,
                  timeUnit: 'm',
                  customMetrics: [
                    {
                      name: 'A',
                      field: 'system.memory.used.bytes',
                      aggType: 'avg',
                    },
                    {
                      name: 'B',
                      field: 'system.cpu.user.pct',
                      aggType: 'avg',
                    },
                  ],
                },
              ],
            },
            'kibana.alert.evaluation.value': [2000000],
            'kibana.alert.evaluation.threshold': 1000000,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].threshold).toBeTruthy();
      });

      it('should handle single metric field correctly', () => {
        const alert = {
          fields: {
            'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
            'kibana.alert.rule.parameters': {
              criteria: [
                {
                  aggType: 'avg',
                  comparator: '>',
                  threshold: [0.8],
                  timeSize: 1,
                  timeUnit: 'm',
                  metric: 'system.process.cpu.total.pct',
                },
              ],
            },
            'kibana.alert.evaluation.value': [0.95],
            'kibana.alert.evaluation.threshold': 0.8,
          },
        };

        const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
        expect(result?.[0].observedValue).toBeTruthy();
        expect(result?.[0].observedValue).toContain('%'); // Should be formatted as percent
      });
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should return undefined when ruleParams is missing', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.evaluation.value': [0.95],
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result).toBeUndefined();
    });

    it('should handle multiple observedValues with array criteria', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.8],
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.process.cpu.total.pct',
              },
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.5],
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.memory.used.pct',
              },
            ],
          },
          'kibana.alert.evaluation.values': [0.95, 0.6],
          'kibana.alert.evaluation.threshold': 0.8,
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result).toHaveLength(2);
      expect(result?.[0]).toBeTruthy();
      expect(result?.[1]).toBeTruthy();
    });

    it('should handle non-array criteria for METRIC_THRESHOLD_ALERT_TYPE_ID', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: {
              aggType: 'avg',
              comparator: '>',
              threshold: [0.8],
              timeSize: 1,
              timeUnit: 'm',
              metric: 'system.process.cpu.total.pct',
            },
          },
          'kibana.alert.evaluation.value': [0.95],
          'kibana.alert.evaluation.threshold': 0.8,
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result).toBeTruthy();
      expect(result?.[0]).toBeTruthy();
    });

    it('should handle unknown rule type by returning empty array', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'unknown.rule.type',
          'kibana.alert.rule.parameters': {
            criteria: [],
          },
          'kibana.alert.evaluation.value': [100],
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result).toEqual([]);
    });

    it('should handle threshold arrays with multiple values', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                aggType: 'avg',
                comparator: 'between',
                threshold: [0.5, 0.8],
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.process.cpu.total.pct',
              },
            ],
          },
          'kibana.alert.evaluation.value': [0.65],
          'kibana.alert.evaluation.threshold': [0.5, 0.8],
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result?.[0].threshold).toContain('AND'); // Multiple thresholds should be joined with AND
    });

    it('should handle warningThreshold with multiple values', () => {
      const alert = {
        fields: {
          'kibana.alert.rule.rule_type_id': 'metrics.alert.threshold',
          'kibana.alert.rule.parameters': {
            criteria: [
              {
                aggType: 'avg',
                comparator: '>',
                threshold: [0.8],
                warningThreshold: [0.5, 0.7],
                warningComparator: 'between',
                timeSize: 1,
                timeUnit: 'm',
                metric: 'system.process.cpu.total.pct',
              },
            ],
          },
          'kibana.alert.evaluation.value': [0.95],
          'kibana.alert.evaluation.threshold': 0.8,
        },
      };

      const result = mapRuleParamsWithFlyout(alert as unknown as TopAlert);
      expect(result?.[0].warningThreshold).toContain('AND'); // Multiple thresholds should be joined with AND
    });
  });
});
