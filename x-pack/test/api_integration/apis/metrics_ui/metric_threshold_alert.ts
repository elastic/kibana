/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import moment from 'moment';
import {
  Aggregators,
  Comparator,
  CountMetricExpressionParams,
  CustomMetricExpressionParams,
  NonCountMetricExpressionParams,
} from '@kbn/infra-plugin/common/alerting/metrics';
import { InfraSource } from '@kbn/infra-plugin/common/source_configuration/source_configuration';
import {
  EvaluatedRuleParams,
  evaluateRule,
} from '@kbn/infra-plugin/server/lib/alerting/metric_threshold/lib/evaluate_rule';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';
import { createFakeLogger } from './create_fake_logger';

const { gauge, rate } = DATES['alert-test-data'];
export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const esClient = getService('es');
  const log = getService('log');
  const logger = createFakeLogger(log);

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
      } as NonCountMetricExpressionParams,
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
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [10000],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 20895,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should alert with custom metric that is a document ratio', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.CUSTOM,
                customMetrics: [
                  { name: 'A', aggType: 'count', filter: 'event.dataset: "apache2.error"' },
                  { name: 'B', aggType: 'count' },
                ],
                equation: '((A + A) / (B + B)) * 100',
                label: 'apache2 error ratio',
              } as CustomMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'custom',
                metric: 'apache2 error ratio',
                label: 'apache2 error ratio',
                customMetrics: [
                  { name: 'A', aggType: 'count', filter: 'event.dataset: "apache2.error"' },
                  { name: 'B', aggType: 'count' },
                ],
                equation: '((A + A) / (B + B)) * 100',
                currentValue: 36.195262024407754,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
      });
      describe('with group by', () => {
        it('should trigger on document count', async () => {
          const params = {
            ...baseParams,
            groupBy: ['event.category'],
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [20000],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              web: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [20000],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 20895,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: 'web' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('shouldFire on document count and isNoData for missing group ', async () => {
          const params = {
            ...baseParams,
            groupBy: ['event.category'],
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [20000],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame,
            [{ key: 'middleware', bucketKey: { groupBy0: 'middleware' } }]
          );
          expect(results).to.eql([
            {
              web: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [20000],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 20895,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: 'web' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
              middleware: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [20000],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: null,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: 'middleware' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should trigger with contaier list in context on document count', async () => {
          const params = {
            ...baseParams,
            groupBy: ['kubernetes.pod.uid'],
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
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );

          expect(results).to.eql([
            {
              'pod-01': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: {
                  groupBy0: 'pod-01',
                },
                context: {
                  cloud: undefined,
                  container: [{ id: 'container-01' }, { id: 'container-02' }],
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
              'pod-02': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: {
                  groupBy0: 'pod-02',
                },
                context: {
                  cloud: undefined,
                  container: [{ id: 'container-03' }, { id: 'container-04' }],
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should trigger with single container in context on document count', async () => {
          const params = {
            ...baseParams,
            groupBy: ['container.id'],
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [2],
                comparator: Comparator.GT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const config = {
            ...configuration,
            metricAlias: 'filebeat-*',
          };
          const timeFrame = { end: DATES.ten_thousand_plus.max };
          const results = await evaluateRule(
            esClient,
            params,
            config,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );

          expect(results).to.eql([
            {
              'container-05': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [2],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-10-19T00:53:59.997Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: {
                  groupBy0: 'container-05',
                },
                context: {
                  cloud: undefined,
                  container: {
                    id: 'container-05',
                  },
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
      });
    });
    describe('without ANY data', () => {
      describe('without groupBy', () => {
        it('should trigger NO_DATA for document count queries', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [0],
                comparator: Comparator.LT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [0],
                comparator: '<=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: null,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should trigger NO_DATA for basic metric', async () => {
          const params = { ...baseParams };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: null,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
      });
      describe('with groupBy', () => {
        describe('without pre-existing groups', () => {
          it('should trigger NO_DATA for document count queries', async () => {
            const params = {
              ...baseParams,
              groupBy: ['event.category'],
              criteria: [
                {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: Comparator.LT_OR_EQ,
                  aggType: Aggregators.COUNT,
                } as CountMetricExpressionParams,
              ],
            };
            const timeFrame = { end: gauge.max };
            const results = await evaluateRule(
              esClient,
              params,
              configuration,
              10000,
              true,
              logger,
              void 0,
              timeFrame
            );
            expect(results).to.eql([
              {
                '*': {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: '<=',
                  aggType: 'count',
                  metric: 'Document count',
                  currentValue: null,
                  timestamp: '2021-01-01T01:00:00.000Z',
                  shouldFire: false,
                  shouldWarn: false,
                  isNoData: true,
                  bucketKey: { groupBy0: '*' },
                  context: {
                    cloud: undefined,
                    container: undefined,
                    host: undefined,
                    labels: undefined,
                    orchestrator: undefined,
                    tags: undefined,
                  },
                },
              },
            ]);
          });
        });
        describe('with pre-existing groups', () => {
          it('should trigger NO_DATA for document count queries', async () => {
            const params = {
              ...baseParams,
              groupBy: ['event.category'],
              criteria: [
                {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: Comparator.LT_OR_EQ,
                  aggType: Aggregators.COUNT,
                } as CountMetricExpressionParams,
              ],
            };
            const timeFrame = { end: gauge.max };
            const results = await evaluateRule(
              esClient,
              params,
              configuration,
              10000,
              true,
              logger,
              void 0,
              timeFrame,
              [
                { key: 'web', bucketKey: { groupBy0: 'web' } },
                { key: 'prod', bucketKey: { groupBy0: 'prod' } },
              ]
            );
            expect(results).to.eql([
              {
                '*': {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: '<=',
                  aggType: 'count',
                  metric: 'Document count',
                  currentValue: null,
                  timestamp: '2021-01-01T01:00:00.000Z',
                  shouldFire: false,
                  shouldWarn: false,
                  isNoData: true,
                  bucketKey: { groupBy0: '*' },
                  context: {
                    cloud: undefined,
                    container: undefined,
                    host: undefined,
                    labels: undefined,
                    orchestrator: undefined,
                    tags: undefined,
                  },
                },
                web: {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: '<=',
                  aggType: 'count',
                  metric: 'Document count',
                  currentValue: null,
                  timestamp: '2021-01-01T01:00:00.000Z',
                  shouldFire: false,
                  shouldWarn: false,
                  isNoData: true,
                  bucketKey: { groupBy0: 'web' },
                  context: {
                    cloud: undefined,
                    container: undefined,
                    host: undefined,
                    labels: undefined,
                    orchestrator: undefined,
                    tags: undefined,
                  },
                },
                prod: {
                  timeSize: 5,
                  timeUnit: 'm',
                  threshold: [0],
                  comparator: '<=',
                  aggType: 'count',
                  metric: 'Document count',
                  currentValue: null,
                  timestamp: '2021-01-01T01:00:00.000Z',
                  shouldFire: false,
                  shouldWarn: false,
                  isNoData: true,
                  bucketKey: { groupBy0: 'prod' },
                  context: {
                    cloud: undefined,
                    container: undefined,
                    host: undefined,
                    labels: undefined,
                    orchestrator: undefined,
                    tags: undefined,
                  },
                },
              },
            ]);
          });
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
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 5,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should alert on ZERO document count outside the time frame', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [0],
                comparator: Comparator.LT_OR_EQ,
                aggType: Aggregators.COUNT,
              } as CountMetricExpressionParams,
            ],
          };
          const timeFrame = { end: gauge.max + 600_000 };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [0],
                comparator: '<=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 0,
                timestamp: '2021-01-01T01:10:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
        it('should alert on the last value when the end date is the same as the last event', async () => {
          const params = { ...baseParams };
          const timeFrame = { end: gauge.max };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              '*': {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 151,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
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
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              dev: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 3,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: 'dev' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'count',
                metric: 'Document count',
                currentValue: 2,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: 'prod' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
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
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
          expect(results).to.eql([
            {
              dev: {
                aggType: 'sum',
                bucketKey: {
                  groupBy0: 'dev',
                },
                comparator: '>=',
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
                currentValue: 150,
                isNoData: false,
                metric: 'value',
                shouldFire: true,
                shouldWarn: false,
                threshold: [1],
                timeSize: 5,
                timeUnit: 'm',
                timestamp: '2021-01-01T01:00:00.000Z',
              },
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: 1,
                timestamp: '2021-01-01T01:00:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: 'prod' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
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
            10000,
            true,
            logger,
            void 0,
            timeFrame,
            [{ key: 'dev', bucketKey: { groupBy0: 'dev' } }]
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
                timestamp: '2021-01-01T00:30:00.000Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: 'dev' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });

        it('should NOT report any alerts when missing group recovers', async () => {
          const params = {
            ...baseParams,
            criteria: [
              {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [100],
                comparator: Comparator.GT,
                aggType: Aggregators.SUM,
                metric: 'value',
              } as NonCountMetricExpressionParams,
            ],
            groupBy: ['env'],
          };
          const timeFrame = { end: moment(gauge.midpoint).add(10, 'm').valueOf() };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            moment(gauge.midpoint).subtract(1, 'm').valueOf(),
            timeFrame,
            [{ key: 'dev', bucketKey: { groupBy0: 'dev' } }]
          );
          expect(results).to.eql([{}]);
        });

        it('should report no data when both groups stop reporting', async () => {
          const params = {
            ...baseParams,
            groupBy: ['env'],
          };
          const timeFrame = { end: moment(gauge.max).add(6, 'm').valueOf() };
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            gauge.max,
            timeFrame
          );
          expect(results).to.eql([
            {
              prod: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: null,
                timestamp: '2021-01-01T01:06:00.000Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: 'prod' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
              dev: {
                timeSize: 5,
                timeUnit: 'm',
                threshold: [1],
                comparator: '>=',
                aggType: 'sum',
                metric: 'value',
                currentValue: null,
                timestamp: '2021-01-01T01:06:00.000Z',
                shouldFire: false,
                shouldWarn: false,
                isNoData: true,
                bucketKey: { groupBy0: 'dev' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
      });
    });
    describe('with rate data', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/alerts_test_data'));
      it('should alert on rate with long threshold', async () => {
        const params = {
          ...baseParams,
          criteria: [
            {
              timeSize: 1,
              timeUnit: 'm',
              threshold: [107374182400],
              comparator: Comparator.LT_OR_EQ,
              aggType: Aggregators.RATE,
              metric: 'value',
            } as NonCountMetricExpressionParams,
          ],
        };
        const timeFrame = { end: rate.max };
        const results = await evaluateRule(
          esClient,
          params,
          configuration,
          10000,
          true,
          logger,
          void 0,
          timeFrame
        );
        expect(results).to.eql([
          {
            '*': {
              timeSize: 1,
              timeUnit: 'm',
              threshold: [107374182400],
              comparator: '<=',
              aggType: 'rate',
              metric: 'value',
              currentValue: 0.6666666666666666,
              timestamp: '2021-01-02T00:05:00.000Z',
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: '*' },
              context: {
                cloud: undefined,
                container: undefined,
                host: undefined,
                labels: undefined,
                orchestrator: undefined,
                tags: undefined,
              },
            },
          },
        ]);
      });
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
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
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
                timestamp: '2021-01-02T00:05:00.000Z',
                shouldFire: true,
                shouldWarn: false,
                isNoData: false,
                bucketKey: { groupBy0: '*' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
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
          const results = await evaluateRule(
            esClient,
            params,
            configuration,
            10000,
            true,
            logger,
            void 0,
            timeFrame
          );
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
                timestamp: '2021-01-02T00:05:00.000Z',
                shouldFire: false,
                shouldWarn: true,
                isNoData: false,
                bucketKey: { groupBy0: 'dev' },
                context: {
                  cloud: undefined,
                  container: undefined,
                  host: undefined,
                  labels: undefined,
                  orchestrator: undefined,
                  tags: undefined,
                },
              },
            },
          ]);
        });
      });
    });
  });
}
