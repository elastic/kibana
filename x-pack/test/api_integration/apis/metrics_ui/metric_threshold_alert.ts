/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  Aggregators,
  Comparator,
  CountMetricExpressionParams,
  NonCountMetricExpressionParams,
} from '../../../../plugins/infra/common/alerting/metrics';
import { InfraSource } from '../../../../plugins/infra/common/source_configuration/source_configuration';
import {
  EvaluatedRuleParams,
  evaluateRule,
} from '../../../../plugins/infra/server/lib/alerting/metric_threshold/lib/evaluate_rule';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const { gauge, rate } = DATES['alert-test-data'];

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');

  const baseParams: EvaluatedRuleParams = {
    groupBy: void 0,
    filterQuery: void 0,
    criteria: [
      {
        timeSize: 5,
        timeUnit: 'm',
        threshold: [1],
        comparator: Comparator.GT_OR_EQ,
        aggType: Aggregators.SUM,
        metric: 'value',
      },
    ],
  };

  const configuration: InfraSource['configuration'] = {
    name: 'Default',
    description: '',
    logIndices: {
      type: 'index_pattern',
      indexPatternId: 'some-test-id',
    },
    metricAlias: 'alerts-test-data',
    inventoryDefaultView: 'default',
    metricsExplorerDefaultView: 'default',
    anomalyThreshold: 70,
    fields: {
      message: ['message'],
    },
    logColumns: [
      {
        timestampColumn: {
          id: '5e7f964a-be8a-40d8-88d2-fbcfbdca0e2f',
        },
      },
      {
        fieldColumn: {
          id: ' eb9777a8-fcd3-420e-ba7d-172fff6da7a2',
          field: 'event.dataset',
        },
      },
      {
        messageColumn: {
          id: 'b645d6da-824b-4723-9a2a-e8cece1645c0',
        },
      },
    ],
  };

  describe('Metric Threshold Alerts Executor', () => {
    describe('with 10K plus docs', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/ten_thousand_plus'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/ten_thousand_plus'));
      describe('without group by', () => {
        it('should alert on document count', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [10000],
                comparator: Comparator.LT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(esClient, params, config, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [10000],
                comparator: '<=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 20895,
                timestamp: '2021-10-19T00:48:59.997Z',
                shouldFire: [false],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
      });
      describe('with group by', () => {
        it('should alert on document count', async () => {
          const params = {
            ...baseParams,
            groupBy: ['event.category'],
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [10000],
                comparator: Comparator.LT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(esClient, params, config, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              web: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [10000],
                comparator: '<=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 20895,
                timestamp: '2021-10-19T00:48:59.997Z',
                shouldFire: [false],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
      });
    });
    describe('with gauge data', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts_test_data'));

      describe('without groupBy', () => {
        it('should alert on document count', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 4,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [true],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
        it('should alert on the last value when the end date is the same as the last event', async () => {
          const params = { ...baseParams };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 1,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [true],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
      });
      describe('with groupBy', () => {
        it('should alert on document count', async () => {
          const params = {
            ...baseParams,
            groupBy: ['env'],
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              dev: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [true],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [true],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
        it('should alert on the last value when the end date is the same as the last event', async () => {
          const params = {
            ...baseParams,
            groupBy: ['env'],
          };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              dev: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 0,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [false],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 1,
                timestamp: '2021-01-01T00:55:00.000Z',
                shouldFire: [true],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });

        it('should report no data when one of the groups has a data gap', async () => {
          const params = {
            ...baseParams,
            groupBy: ['env'],
          };
          const timeFrame = { end: gauge.midpoint };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            ['dev', 'prod'],
            10000,
            timeFrame
          );
          expect(results).to.eql([
            {
              dev: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: null,
                timestamp: '2021-01-01T00:25:00.000Z',
                shouldFire: [false],
                shouldWarn: [false],
                isNoData: [true],
                isError: false,
              },
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 0,
                timestamp: '2021-01-01T00:25:00.000Z',
                shouldFire: [false],
                shouldWarn: [false],
                isNoData: [false],
                isError: false,
              },
            },
          ]);
        });
      });
    });

    describe('with rate data', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      describe('without groupBy', () => {
        it('should alert on rate', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 1,
                timeUnit: 'm',
                threshold: [0.5],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.RATE,
                metric: 'value',
              } as NonCountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: rate.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              '*': {
                timeSize: 1,
                timeUnit: 'm',
                threshold: [0.5],
                comparator: '>=',
                aggType: 'rate',
                metric: 'value',
                currentValue: 0.6666666666666666,
                timestamp: '2021-01-02T00:04:00.000Z',
                shouldFire: [false, false, false, false, true],
                shouldWarn: [false],
                isNoData: [true, false, false, false, false],
                isError: false,
              },
            },
          ]);
        });
      });
      describe('with groupBy', () => {
        it('should warn but not fire on rate', async () => {
          const params = {
            ...baseParams,
            groupBy: 'env',
            criteria: [
              {
                timeSize: 1,
                timeUnit: 'm',
                threshold: [1],
                comparator: Comparator.GT_OR_EQ,
                warningThreshold: [0.5],
                warningComparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.RATE,
                metric: 'value',
              } as NonCountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: rate.max };
          const results = await evaluateRule(esClient, params, configuration, [], 10000, timeFrame);
          expect(results).to.eql([
            {
              dev: {
                timeSize: 1,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                warningThreshold: [0.5],
                warningComparator: '>=',
                aggType: 'rate',
                metric: 'value',
                currentValue: 0.6666666666666666,
                timestamp: '2021-01-02T00:04:00.000Z',
                shouldFire: [false, false, false, false, false],
                shouldWarn: [false, false, false, false, true],
                isNoData: [true, false, false, false, false],
                isError: false,
              },
            },
          ]);
        });
      });
    });
  });
}
