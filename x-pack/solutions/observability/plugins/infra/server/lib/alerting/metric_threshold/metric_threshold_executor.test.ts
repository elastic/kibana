/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import rison from '@kbn/rison';
import { getThresholds } from '../common/get_values';
import { set } from '@kbn/safer-lodash-set';
import { COMPARATORS } from '@kbn/alerting-comparators';
import type {
  CountMetricExpressionParams,
  NonCountMetricExpressionParams,
} from '../../../../common/alerting/metrics';
import { Aggregators } from '../../../../common/alerting/metrics';
import {
  createMetricThresholdExecutor,
  FIRED_ACTIONS,
  NO_DATA_ACTIONS,
  WARNING_ACTIONS,
} from './metric_threshold_executor';
import type { Evaluation } from './lib/evaluate_rule';
import type { LogMeta, Logger } from '@kbn/logging';
import { DEFAULT_FLAPPING_SETTINGS } from '@kbn/alerting-plugin/common';
import type { InfraConfig } from '../../../../common/plugin_config_types';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_REASON,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
} from '@kbn/rule-data-utils';
import { type Group } from '@kbn/alerting-rule-utils';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import type {
  AssetDetailsLocatorParams,
  MetricsExplorerLocatorParams,
} from '@kbn/observability-shared-plugin/common';
import type { InfraLocators } from '../../infra_types';

jest.mock('./lib/evaluate_rule', () => ({ evaluateRule: jest.fn() }));

const fakeLogger = <Meta extends LogMeta = LogMeta>(msg: string, meta?: Meta) => {};

const logger = {
  trace: fakeLogger,
  debug: fakeLogger,
  info: fakeLogger,
  warn: fakeLogger,
  error: fakeLogger,
  fatal: fakeLogger,
  log: () => void 0,
  get: () => logger,
} as unknown as Logger;

const mockNow = new Date('2023-09-20T15:11:04.105Z');

const STARTED_AT_MOCK_DATE = new Date();

const mockAssetDetailsLocator = {
  getRedirectUrl: jest.fn(),
};

const mockMetricsExplorerLocator = {
  getRedirectUrl: jest.fn(),
};

const mockOptions = {
  executionId: '',
  startedAt: mockNow,
  startedAtOverridden: false,
  previousStartedAt: null,
  state: {},
  spaceId: '',
  rule: {
    id: '',
    name: '',
    tags: [],
    consumer: '',
    enabled: true,
    schedule: {
      interval: '1h',
    },
    actions: [],
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    throttle: null,
    notifyWhen: null,
    producer: '',
    revision: 0,
    ruleTypeId: '',
    ruleTypeName: '',
    muteAll: false,
    snoozeSchedule: [],
  },
  logger,
  flappingSettings: DEFAULT_FLAPPING_SETTINGS,
  getTimeRange: () => {
    const date = STARTED_AT_MOCK_DATE.toISOString();
    return { dateStart: date, dateEnd: date };
  },
  isServerless: false,
};

const setEvaluationResults = (response: Array<Record<string, Evaluation>>) => {
  return jest.requireMock('./lib/evaluate_rule').evaluateRule.mockImplementation(() => response);
};

describe('The metric threshold rule type', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime();
  });
  beforeEach(() => {
    jest.clearAllMocks();

    mockAssetDetailsLocator.getRedirectUrl.mockImplementation(
      ({ entityId, entityType, assetDetails }: AssetDetailsLocatorParams) =>
        `/node-mock/${entityType}/${entityId}?receivedParams=${rison.encodeUnknown(assetDetails)}`
    );

    mockMetricsExplorerLocator.getRedirectUrl.mockImplementation(
      ({}: MetricsExplorerLocatorParams) => `/metrics-mock`
    );

    services.alertsClient.report.mockImplementation(({ id }: { id: string }) => ({
      uuid: `uuid-${id}`,
      start: new Date().toISOString(),
    }));
  });
  afterAll(() => jest.useRealTimers());

  describe('querying the entire infrastructure', () => {
    const execute = (comparator: COMPARATORS, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
            },
          ],
        },
      });
    const setResults = (
      comparator: COMPARATORS,
      threshold: number[],
      shouldFire: boolean = false,
      shouldWarn: boolean = false,
      isNoData: boolean = false
    ) =>
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator,
            threshold,
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire,
            shouldWarn,
            isNoData,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

    test('should report alert with the > comparator when condition is met', async () => {
      setResults(COMPARATORS.GREATER_THAN, [0.75], true);
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when above 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the > comparator when condition is not met', async () => {
      setResults(COMPARATORS.GREATER_THAN, [1.5], false);
      await execute(COMPARATORS.GREATER_THAN, [1.5]);
      testNAlertsReported(0);
    });

    test('should report alert with the < comparator when condition is met', async () => {
      setResults(COMPARATORS.LESS_THAN, [1.5], true);
      await execute(COMPARATORS.LESS_THAN, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [1.5], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when below 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the < comparator when condition is not met', async () => {
      setResults(COMPARATORS.LESS_THAN, [0.75], false);
      await execute(COMPARATORS.LESS_THAN, [0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the >= comparator when condition is met', async () => {
      setResults(COMPARATORS.GREATER_THAN_OR_EQUALS, [0.75], true);
      await execute(COMPARATORS.GREATER_THAN_OR_EQUALS, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when above or equal 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the >= comparator when condition is not met', async () => {
      setResults(COMPARATORS.GREATER_THAN_OR_EQUALS, [1.5], false);
      await execute(COMPARATORS.GREATER_THAN_OR_EQUALS, [1.5]);
      testNAlertsReported(0);
    });

    test('should report alert with the <= comparator when condition is met', async () => {
      setResults(COMPARATORS.LESS_THAN_OR_EQUALS, [1.5], true);
      await execute(COMPARATORS.LESS_THAN_OR_EQUALS, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [1.5], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when below or equal 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the <= comparator when condition is not met', async () => {
      setResults(COMPARATORS.LESS_THAN_OR_EQUALS, [0.75], false);
      await execute(COMPARATORS.LESS_THAN_OR_EQUALS, [0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the between comparator when condition is met', async () => {
      setResults(COMPARATORS.BETWEEN, [0, 1.5], true);
      await execute(COMPARATORS.BETWEEN, [0, 1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [0, 1.5], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when between 0 and 1.5.',
        tags: [],
      });
    });

    test('should not report any alerts with the between comparator when condition is not met', async () => {
      setResults(COMPARATORS.BETWEEN, [0, 0.75], false);
      await execute(COMPARATORS.BETWEEN, [0, 0.75]);
      testNAlertsReported(0);
    });

    test('should report alert with the outside range comparator when condition is met', async () => {
      setResults(COMPARATORS.NOT_BETWEEN, [0, 0.75], true);
      await execute(COMPARATORS.NOT_BETWEEN, [0, 0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: '*',
        conditions: [
          { metric: 'test.metric.1', threshold: [0, 0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when not between 0 and 0.75.',
        tags: [],
      });
    });

    test('should not report any alerts with the outside range comparator when condition is not met', async () => {
      setResults(COMPARATORS.NOT_BETWEEN, [0, 1.5], false);
      await execute(COMPARATORS.NOT_BETWEEN, [0, 1.5]);
      testNAlertsReported(0);
    });
  });

  describe('querying with a groupBy parameter', () => {
    const execute = (
      comparator: COMPARATORS,
      threshold: number[],
      groupBy: string[] = ['something'],
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
        },
        state: state ?? mockOptions.state,
      });
    const alertIdA = 'a';
    const alertIdB = 'b';

    test('should report alert when all groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when above 0.75.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for b. Alert when above 0.75.',
        tags: [],
        groupByKeys: { something: alertIdB },
        grouping: { something: alertIdB },
      });
    });

    test('should report alert when only some groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1.5],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1.5],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(COMPARATORS.LESS_THAN, [1.5]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: [1.5], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when below 1.5.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: 'a' },
      });
    });

    test('should not report any alerts when no groups pass the threshold', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [5],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [5],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [5]);
      testNAlertsReported(0);
    });

    test('should persist previous groups that go missing, until the groupBy param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await execute(
        COMPARATORS.GREATER_THAN,
        [0.75],
        ['something'],
        'test.metric.2'
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await execute(
        COMPARATORS.GREATER_THAN,
        [0.75],
        ['something'],
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(
        expect.arrayContaining([{ key: 'c', bucketKey: { groupBy0: 'c' } }])
      );
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await execute(
        COMPARATORS.GREATER_THAN,
        [0.75],
        ['something', 'something-else'],
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });

    const executeWithFilter = (
      comparator: COMPARATORS,
      threshold: number[],
      filterQuery: string,
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy: ['something'],
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
          filterQuery,
        },
        state: state ?? mockOptions.state,
      });

    test('should persist previous groups that go missing, until the filterQuery param changes', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.2'
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual(
        expect.arrayContaining([{ key: 'c', bucketKey: { groupBy0: 'c' } }])
      );
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const { state: stateResult3 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'different' }),
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual(expect.arrayContaining([]));
    });

    test('should remove a group from previous missing groups if the related alert is untracked', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult1 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.2'
      );
      expect(stateResult1.missingGroups).toEqual(expect.arrayContaining([]));
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const { state: stateResult2 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult1
      );
      expect(stateResult2.missingGroups).toEqual([
        { key: 'b', bucketKey: { groupBy0: 'b' } },
        { key: 'c', bucketKey: { groupBy0: 'c' } },
      ]);
      const mockedEvaluateRule = setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      // Consider c as untracked
      services.alertsClient.isTrackedAlert.mockImplementation((id: string) => id !== 'c');
      const { state: stateResult3 } = await executeWithFilter(
        COMPARATORS.GREATER_THAN,
        [0.75],
        JSON.stringify({ query: 'q' }),
        'test.metric.1',
        stateResult2
      );
      expect(stateResult3.missingGroups).toEqual([{ key: 'b', bucketKey: { groupBy0: 'b' } }]);
      expect(mockedEvaluateRule.mock.calls[2][8]).toEqual([
        { bucketKey: { groupBy0: 'b' }, key: 'b' },
      ]);
    });
  });

  describe('querying with a groupBy parameter host.name and rule tags', () => {
    const execute = (
      comparator: COMPARATORS,
      threshold: number[],
      groupBy: string[] = ['host.name'],
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
        },
        state: state ?? mockOptions.state,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });
    const alertIdA = 'host-01';
    const alertIdB = 'host-02';

    test('rule tags and source tags are combined in alert context', async () => {
      setEvaluationResults([
        {
          'host-01': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'host-01' },
            context: {
              tags: ['host-01_tag1', 'host-01_tag2'],
            },
          },
          'host-02': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'host-02' },
            context: {
              tags: ['host-02_tag1', 'host-02_tag2'],
            },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for host-01. Alert when above 0.75.',
        tags: ['host-01_tag1', 'host-01_tag2', 'ruleTag1', 'ruleTag2'],
        groupByKeys: { host: { name: alertIdA } },
        group: [{ field: 'host.name', value: alertIdA }],
        ecsGroups: { 'host.name': alertIdA },
        grouping: { host: { name: alertIdA } },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for host-02. Alert when above 0.75.',
        tags: ['host-02_tag1', 'host-02_tag2', 'ruleTag1', 'ruleTag2'],
        groupByKeys: { host: { name: alertIdB } },
        group: [{ field: 'host.name', value: alertIdB }],
        ecsGroups: { 'host.name': alertIdB },
        grouping: { host: { name: alertIdB } },
      });
    });
  });

  describe('querying without a groupBy parameter and rule tags', () => {
    const execute = (
      comparator: COMPARATORS,
      threshold: number[],
      groupBy: string = '',
      metric?: string,
      state?: any
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              metric: metric ?? baseNonCountCriterion.metric,
            },
          ],
        },
        state: state ?? mockOptions.state,
        rule: {
          ...mockOptions.rule,
          tags: ['ruleTag1', 'ruleTag2'],
        },
      });

    test('rule tags are added in alert context', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.75],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

      const alertID = '*';
      await execute(COMPARATORS.GREATER_THAN, [0.75]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.75], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when above 0.75.',
        tags: ['ruleTag1', 'ruleTag2'],
      });
    });
  });

  describe('querying with multiple criteria', () => {
    const execute = (
      comparator: COMPARATORS,
      thresholdA: number[],
      thresholdB: number[],
      groupBy: string = '',
      sourceId: string = 'default'
    ) =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          groupBy,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold: thresholdA,
            },
            {
              ...baseNonCountCriterion,
              comparator,
              threshold: thresholdB,
              metric: 'test.metric.2',
            },
          ],
        },
      });

    test('should report alert when all criteria cross the threshold', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      const alertID = '*';
      await execute(COMPARATORS.GREATER_THAN_OR_EQUALS, [1.0], [3.0]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: [1], value: '1', evaluation_value: 1 },
          { metric: 'test.metric.2', threshold: [3], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason:
          'test.metric.1 is 1 in the last 1 min. Alert when above or equal 1.\ntest.metric.2 is 3 in the last 1 min. Alert when above or equal 3.',
        tags: [],
      });
    });

    test('should not report any alerts when some, but not all, criteria cross the threshold', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
        {},
      ]);
      await execute(COMPARATORS.LESS_THAN_OR_EQUALS, [1.0], [2.5]);
      testNAlertsReported(0);
    });

    test('alerts only on groups that meet all criteria when querying with a groupBy parameter', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [1.0],
            metric: 'test.metric.1',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 3.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN_OR_EQUALS,
            threshold: [3.0],
            metric: 'test.metric.2',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      const alertIdA = 'a';
      await execute(COMPARATORS.GREATER_THAN_OR_EQUALS, [1.0], [3.0], 'something');
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.1', threshold: [1], value: '1', evaluation_value: 1 },
          { metric: 'test.metric.2', threshold: [3], value: '3', evaluation_value: 3 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason:
          'test.metric.1 is 1 in the last 1 min for a. Alert when above or equal 1.\ntest.metric.2 is 3 in the last 1 min for a. Alert when above or equal 3.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
    });
  });

  describe('querying with the count aggregator', () => {
    const alertID = '*';
    const execute = (comparator: COMPARATORS, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseCountCriterion,
              comparator,
              threshold,
            } as CountMetricExpressionParams,
          ],
        },
      });

    test('alerts based on the doc_count value instead of the aggregatedValue', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.9],
            metric: 'count',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [0.9]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [{ metric: 'count', threshold: [0.9], value: '1', evaluation_value: 1 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'count is 1 in the last 1 min. Alert when above 0.9.',
        tags: [],
      });

      setEvaluationResults([
        {
          '*': {
            ...baseCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [0.5],
            metric: 'count',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
        },
      ]);
      await execute(COMPARATORS.LESS_THAN, [0.5]);
      // should still have only been called once
      testNAlertsReported(1);
    });

    describe('with a groupBy parameter', () => {
      const executeGroupBy = (
        comparator: COMPARATORS,
        threshold: number[],
        sourceId: string = 'default',
        state?: any
      ) =>
        executor({
          ...mockOptions,
          services,
          params: {
            sourceId,
            groupBy: 'something',
            criteria: [
              {
                ...baseCountCriterion,
                comparator,
                threshold,
              },
            ],
          },
          state: state ?? mockOptions.state,
        });
      const alertIdA = 'a';
      const alertIdB = 'b';

      test('successfully detects and alerts on a document count of 0', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseCountCriterion,
              comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
              threshold: [0],
              metric: 'count',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseCountCriterion,
              comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
              threshold: [0],
              metric: 'count',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        const resultState = await executeGroupBy(COMPARATORS.LESS_THAN_OR_EQUALS, [0]);
        testNAlertsReported(0);
        setEvaluationResults([
          {
            a: {
              ...baseCountCriterion,
              comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
              threshold: [0],
              metric: 'count',
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseCountCriterion,
              comparator: COMPARATORS.LESS_THAN_OR_EQUALS,
              threshold: [0],
              metric: 'count',
              currentValue: 0,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        await executeGroupBy(COMPARATORS.LESS_THAN_OR_EQUALS, [0], 'empty-response', resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [{ metric: 'count', threshold: [0], value: '0', evaluation_value: 0 }],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'count is 0 in the last 1 min for a. Alert when below or equal 0.',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [{ metric: 'count', threshold: [0], value: '0', evaluation_value: 0 }],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'count is 0 in the last 1 min for b. Alert when below or equal 0.',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });
      });
    });
  });
  describe('querying with the p99 aggregator', () => {
    const alertID = '*';
    const execute = (comparator: COMPARATORS, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              aggType: Aggregators.P99,
              metric: 'test.metric.2',
            },
          ],
        },
      });

    test('alerts based on the p99 values', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [1],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [1]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [{ metric: 'test.metric.2', threshold: [1], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min. Alert when above 1.',
        tags: [],
      });

      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(COMPARATORS.LESS_THAN, [1]);
      // should still only have been called once
      testNAlertsReported(1);
    });
  });

  describe('querying with the p95 aggregator', () => {
    const alertID = '*';
    const execute = (comparator: COMPARATORS, threshold: number[], sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator,
              threshold,
              aggType: Aggregators.P95,
              metric: 'test.metric.1',
            },
          ],
        },
      });
    test('alerts based on the p95 values', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0.25],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(COMPARATORS.GREATER_THAN, [0.25]);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.1', threshold: [0.25], value: '1', evaluation_value: 1 },
        ],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min. Alert when above 0.25.',
        tags: [],
      });

      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [0.95],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(COMPARATORS.LESS_THAN, [0.95]);
      // should still only have been called once
      testNAlertsReported(1);
    });
  });

  describe("querying a metric that hasn't reported data", () => {
    const alertID = '*';
    const execute = (alertOnNoData: boolean, sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.3',
            },
          ],
          alertOnNoData,
        },
      });

    test('sends a No Data alert when configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(true);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: [1], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
      });
    });

    test('does not send a No Data alert when not configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      await execute(false);
      testNAlertsReported(0);
    });
  });

  describe('alerts with NO_DATA where one condition is an aggregation and the other is a document count', () => {
    const alertID = '*';
    const execute = (alertOnNoData: boolean, sourceId: string = 'default') =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId,
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.3',
            },
            {
              ...baseCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [30],
            },
          ],
          alertOnNoData,
        },
      });

    test('sends a No Data alert when configured to do so', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.LESS_THAN,
            threshold: [1],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: mockNow.toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
        {},
      ]);
      await execute(true);
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          {
            metric: 'test.metric.3',
            threshold: [1],
            formattedThreshold: ['1'],
            value: '[NO DATA]',
            evaluation_value: null,
          },
          // Threshold will not be formatted because there is no result for the second condition
          { metric: 'count', threshold: [30], formattedThreshold: [30], value: 0 },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
      });
    });
  });

  describe('querying a groupBy alert that starts reporting no data, and then later reports data', () => {
    const alertID = '*';
    const alertIdA = 'a';
    const alertIdB = 'b';
    const alertIdC = 'c';
    const execute = (metric: string, alertOnGroupDisappear: boolean = true, state?: any) =>
      executor({
        ...mockOptions,
        services,
        params: {
          groupBy: 'something',
          sourceId: 'default',
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric,
            },
          ],
          alertOnNoData: true,
          alertOnGroupDisappear,
        },
        state: state ?? mockOptions.state,
      });

    const executeEmptyResponse = (...args: [boolean?, any?]) => execute('test.metric.3', ...args);
    const execute3GroupsABCResponse = (...args: [boolean?, any?]) =>
      execute('test.metric.2', ...args);
    const execute2GroupsABResponse = (...args: [boolean?, any?]) =>
      execute('test.metric.1', ...args);

    // Store state between tests. Jest won't preserve reassigning a let so use an array instead.
    const interTestStateStorage: any[] = [];

    test('first sends a No Data alert with the * group, but then reports groups when data is available', async () => {
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      let resultState = await executeEmptyResponse();
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: [0], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
        groupByKeys: { something: alertID },
        grouping: { something: alertID },
      });

      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);
      resultState = await executeEmptyResponse(true, resultState);
      testNAlertsReported(2);
      testAlertReported(2, {
        id: alertID,
        conditions: [
          { metric: 'test.metric.3', threshold: [0], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m',
        tags: [],
        groupByKeys: { something: alertID },
        grouping: { something: alertID },
      });

      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 1.0,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      resultState = await execute2GroupsABResponse(true, resultState);
      testNAlertsReported(4);
      testAlertReported(3, {
        id: alertIdA,
        conditions: [{ metric: 'test.metric.1', threshold: [0], value: '1', evaluation_value: 1 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
      testAlertReported(4, {
        id: alertIdB,
        conditions: [{ metric: 'test.metric.1', threshold: [0], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
        grouping: { something: alertIdB },
      });

      interTestStateStorage.push(resultState); // Hand off resultState to the next test
    });

    test('sends No Data alerts for the previously detected groups when they stop reporting data, but not the * group', async () => {
      // Pop a previous execution result instead of defining it manually
      // The type signature of alert executor states are complex
      const resultState = interTestStateStorage.pop();
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.3',
            currentValue: null,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn: false,
            isNoData: true,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await executeEmptyResponse(true, resultState);
      testNAlertsReported(2);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [
          { metric: 'test.metric.3', threshold: [0], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m for a',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [
          { metric: 'test.metric.3', threshold: [0], value: '[NO DATA]', evaluation_value: null },
        ],
        actionGroup: NO_DATA_ACTIONS.id,
        alertState: 'NO DATA',
        reason: 'test.metric.3 reported no data in the last 1m for b',
        tags: [],
        groupByKeys: { something: alertIdB },
        grouping: { something: alertIdB },
      });
    });

    test('does not send individual No Data alerts when groups disappear if alertOnGroupDisappear is disabled', async () => {
      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
          c: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.2',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'c' },
          },
        },
      ]);
      const resultState = await execute3GroupsABCResponse(false);
      testNAlertsReported(3);
      testAlertReported(1, {
        id: alertIdA,
        conditions: [{ metric: 'test.metric.2', threshold: [0], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min for a. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
      testAlertReported(2, {
        id: alertIdB,
        conditions: [{ metric: 'test.metric.2', threshold: [0], value: '1', evaluation_value: 1 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 1 in the last 1 min for b. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
        grouping: { something: alertIdB },
      });
      testAlertReported(3, {
        id: alertIdC,
        conditions: [{ metric: 'test.metric.2', threshold: [0], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.2 is 3 in the last 1 min for c. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdC },
        grouping: { something: alertIdC },
      });

      setEvaluationResults([
        {
          a: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 1,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'a' },
          },
          b: {
            ...baseNonCountCriterion,
            comparator: COMPARATORS.GREATER_THAN,
            threshold: [0],
            metric: 'test.metric.1',
            currentValue: 3,
            timestamp: new Date().toISOString(),
            shouldFire: true,
            shouldWarn: false,
            isNoData: false,
            bucketKey: { groupBy0: 'b' },
          },
        },
      ]);
      await execute2GroupsABResponse(false, resultState);
      testNAlertsReported(5);
      testAlertReported(4, {
        id: alertIdA,
        conditions: [{ metric: 'test.metric.1', threshold: [0], value: '1', evaluation_value: 1 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdA },
        grouping: { something: alertIdA },
      });
      testAlertReported(5, {
        id: alertIdB,
        conditions: [{ metric: 'test.metric.1', threshold: [0], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ALERT',
        reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when above 0.',
        tags: [],
        groupByKeys: { something: alertIdB },
        grouping: { something: alertIdB },
      });
    });

    describe('if alertOnNoData is disabled but alertOnGroupDisappear is enabled', () => {
      const executeWeirdNoDataConfig = (metric: string, state?: any) =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [0],
                metric,
              },
            ],
            alertOnNoData: false,
            alertOnGroupDisappear: true,
          },
          state: state ?? mockOptions.state,
        });

      const executeWeirdEmptyResponse = (...args: [any?]) =>
        executeWeirdNoDataConfig('test.metric.3', ...args);
      const executeWeird2GroupsABResponse = (...args: [any?]) =>
        executeWeirdNoDataConfig('test.metric.1', ...args);

      test('does not send a No Data alert with the * group, but then reports groups when data is available', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        let resultState = await executeWeirdEmptyResponse();
        testNAlertsReported(0);
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        resultState = await executeWeirdEmptyResponse(resultState);
        testNAlertsReported(0);
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.1',
              currentValue: 1,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.1',
              currentValue: 3,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        resultState = await executeWeird2GroupsABResponse(resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [0], value: '1', evaluation_value: 1 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 1 in the last 1 min for a. Alert when above 0.',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            { metric: 'test.metric.1', threshold: [0], value: '3', evaluation_value: 3 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 3 in the last 1 min for b. Alert when above 0.',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });

        interTestStateStorage.push(resultState); // Hand off resultState to the next test
      });

      test('sends No Data alerts for the previously detected groups when they stop reporting data, but not the * group', async () => {
        const resultState = interTestStateStorage.pop(); // Import the resultState from the previous test
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [0],
              metric: 'test.metric.3',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);
        await executeWeirdEmptyResponse(resultState);
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            {
              metric: 'test.metric.3',
              threshold: [0],
              value: '[NO DATA]',
              evaluation_value: null,
            },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.3 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            {
              metric: 'test.metric.3',
              threshold: [0],
              value: '[NO DATA]',
              evaluation_value: null,
            },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.3 reported no data in the last 1m for b',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });
      });
    });
  });

  describe('noDataBehavior parameter', () => {
    const alertID = '*';

    describe("noDataBehavior: 'recover' (default)", () => {
      const execute = (sourceId: string = 'default') =>
        executor({
          ...mockOptions,
          services,
          params: {
            sourceId,
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'recover',
          },
        });

      test('should not report any alerts when there is no data', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        await execute();
        testNAlertsReported(0);
      });

      test('should report alert when condition is met', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: 2,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        await execute();
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertID,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '2', evaluation_value: 2 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 2 in the last 1 min. Alert when above 1.',
          tags: [],
        });
      });
    });

    describe("noDataBehavior: 'alertOnNoData'", () => {
      const execute = (sourceId: string = 'default') =>
        executor({
          ...mockOptions,
          services,
          params: {
            sourceId,
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'alertOnNoData',
          },
        });

      test('should report NO_DATA alert when there is no data', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);
        await execute();
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertID,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m',
          tags: [],
        });
      });
    });

    describe("noDataBehavior: 'remainActive'", () => {
      const execute = (state?: any) =>
        executor({
          ...mockOptions,
          services,
          params: {
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'remainActive',
          },
          state: state ?? mockOptions.state,
        });

      test('should keep alert in ALERT state when there is no data and alert was previously active', async () => {
        // Mock that the alert is tracked (previously active)
        services.alertsClient.isTrackedAlert.mockReturnValue(true);

        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await execute();
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertID,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: FIRED_ACTIONS.id, // Should stay in ALERT state, not NO_DATA
          alertState: 'ALERT',
          reason: 'test.metric.1 reported no data in the last 1m',
          tags: [],
        });

        // Reset mock
        services.alertsClient.isTrackedAlert.mockReturnValue(false);
      });

      test('should not create new alert when there is no data and alert was not previously active', async () => {
        // Mock that the alert is NOT tracked (not previously active)
        services.alertsClient.isTrackedAlert.mockReturnValue(false);

        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await execute();
        testNAlertsReported(0);
      });
    });

    describe('noDataBehavior takes precedence over alertOnNoData', () => {
      test("noDataBehavior: 'recover' should override alertOnNoData: true", async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await executor({
          ...mockOptions,
          services,
          params: {
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            alertOnNoData: true, // This should be overridden
            noDataBehavior: 'recover',
          },
        });

        // Should recover (no alert) because noDataBehavior takes precedence
        testNAlertsReported(0);
      });

      test("noDataBehavior: 'alertOnNoData' should override alertOnNoData: false", async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await executor({
          ...mockOptions,
          services,
          params: {
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            alertOnNoData: false, // This should be overridden
            noDataBehavior: 'alertOnNoData',
          },
        });

        // Should trigger NO_DATA alert because noDataBehavior takes precedence
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertID,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m',
          tags: [],
        });
      });
    });

    describe('backward compatibility - when noDataBehavior is not set', () => {
      test('should use alertOnNoData: true behavior (trigger NO_DATA alert)', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await executor({
          ...mockOptions,
          services,
          params: {
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            alertOnNoData: true,
            // noDataBehavior is not set - should fall back to alertOnNoData behavior
          },
        });

        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertID,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m',
          tags: [],
        });
      });

      test('should use alertOnNoData: false behavior (recover/no alert)', async () => {
        setEvaluationResults([
          {
            '*': {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: '*' },
            },
          },
        ]);

        await executor({
          ...mockOptions,
          services,
          params: {
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            alertOnNoData: false,
            // noDataBehavior is not set - should fall back to alertOnNoData behavior
          },
        });

        testNAlertsReported(0);
      });
    });

    describe("noDataBehavior: 'remainActive' with groupBy", () => {
      const alertIdA = 'a';

      const execute = () =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'remainActive',
          },
        });

      test('should keep only tracked group alerts active when there is no data', async () => {
        // Mock: group 'a' is tracked, group 'b' is not tracked
        services.alertsClient.isTrackedAlert.mockImplementation((id: string) => id === alertIdA);

        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // Only group 'a' should be reported (it was tracked)
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: FIRED_ACTIONS.id, // Should stay in ALERT state
          alertState: 'ALERT',
          reason: 'test.metric.1 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });

        // Reset mock
        services.alertsClient.isTrackedAlert.mockReturnValue(false);
      });
    });

    describe("noDataBehavior: 'recover' with groupBy", () => {
      const alertIdA = 'a';

      const execute = () =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'recover',
          },
        });

      test('should not report alerts for groups with no data (all groups recover)', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // No alerts should be reported - all groups recover
        testNAlertsReported(0);
      });

      test('should report alert only for groups that meet condition, not for no-data groups', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: 2,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // Only group 'a' should be reported (has data and meets condition)
        // Group 'b' should recover (no alert)
        testNAlertsReported(1);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '2', evaluation_value: 2 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 2 in the last 1 min for a. Alert when above 1.',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
      });
    });

    describe("noDataBehavior: 'alertOnNoData' with groupBy", () => {
      const alertIdA = 'a';
      const alertIdB = 'b';

      const execute = () =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'alertOnNoData',
          },
        });

      test('should report NO_DATA alerts for all groups with no data', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // Both groups should get NO_DATA alerts
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m for b',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });
      });

      test('should report FIRED alert for firing group and NO_DATA for no-data group', async () => {
        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: 2,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '2', evaluation_value: 2 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 2 in the last 1 min for a. Alert when above 1.',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: NO_DATA_ACTIONS.id,
          alertState: 'NO DATA',
          reason: 'test.metric.1 reported no data in the last 1m for b',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });
      });
    });

    describe("noDataBehavior: 'remainActive' with groupBy - mixed scenarios", () => {
      const alertIdA = 'a';
      const alertIdB = 'b';
      const alertIdC = 'c';

      const execute = () =>
        executor({
          ...mockOptions,
          services,
          params: {
            groupBy: 'something',
            sourceId: 'default',
            criteria: [
              {
                ...baseNonCountCriterion,
                comparator: COMPARATORS.GREATER_THAN,
                threshold: [1],
                metric: 'test.metric.1',
              },
            ],
            noDataBehavior: 'remainActive',
          },
        });

      test('should handle mixed scenario: firing, no-data tracked, and no-data untracked groups', async () => {
        // Mock: group 'a' is tracked (was previously active), group 'b' is not tracked, group 'c' has data
        services.alertsClient.isTrackedAlert.mockImplementation(
          (id: string) => id === alertIdA || id === alertIdC
        );

        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
            c: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: 2,
              timestamp: new Date().toISOString(),
              shouldFire: true,
              shouldWarn: false,
              isNoData: false,
              bucketKey: { groupBy0: 'c' },
            },
          },
        ]);

        await execute();

        // Group 'a': tracked + no data → should remain active (FIRED)
        // Group 'b': not tracked + no data → should NOT create new alert
        // Group 'c': has data + firing → should report FIRED alert
        testNAlertsReported(2);

        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });

        testAlertReported(2, {
          id: alertIdC,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '2', evaluation_value: 2 },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 is 2 in the last 1 min for c. Alert when above 1.',
          tags: [],
          groupByKeys: { something: alertIdC },
          grouping: { something: alertIdC },
        });

        // Reset mock
        services.alertsClient.isTrackedAlert.mockReturnValue(false);
      });

      test('should keep all tracked groups active when all have no data', async () => {
        // All groups are tracked
        services.alertsClient.isTrackedAlert.mockReturnValue(true);

        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // Both groups are tracked, both should remain active
        testNAlertsReported(2);
        testAlertReported(1, {
          id: alertIdA,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 reported no data in the last 1m for a',
          tags: [],
          groupByKeys: { something: alertIdA },
          grouping: { something: alertIdA },
        });
        testAlertReported(2, {
          id: alertIdB,
          conditions: [
            { metric: 'test.metric.1', threshold: [1], value: '[NO DATA]', evaluation_value: null },
          ],
          actionGroup: FIRED_ACTIONS.id,
          alertState: 'ALERT',
          reason: 'test.metric.1 reported no data in the last 1m for b',
          tags: [],
          groupByKeys: { something: alertIdB },
          grouping: { something: alertIdB },
        });

        // Reset mock
        services.alertsClient.isTrackedAlert.mockReturnValue(false);
      });

      test('should not create any alerts when no groups are tracked and all have no data', async () => {
        // No groups are tracked
        services.alertsClient.isTrackedAlert.mockReturnValue(false);

        setEvaluationResults([
          {
            a: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'a' },
            },
            b: {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [1],
              metric: 'test.metric.1',
              currentValue: null,
              timestamp: new Date().toISOString(),
              shouldFire: false,
              shouldWarn: false,
              isNoData: true,
              bucketKey: { groupBy0: 'b' },
            },
          },
        ]);

        await execute();

        // No groups are tracked, no alerts should be created
        testNAlertsReported(0);
      });
    });
  });

  describe('attempting to use a malformed filterQuery', () => {
    const alertID = '*';
    const execute = () =>
      executor({
        ...mockOptions,
        services,
        params: {
          criteria: [
            {
              ...baseNonCountCriterion,
            },
          ],
          sourceId: 'default',
          filterQuery: '',
          filterQueryText:
            'host.name:(look.there.is.no.space.after.these.parentheses)and uh.oh: "wow that is bad"',
        },
      });

    test('reports an error', async () => {
      await execute();
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [{ metric: 'test.metric.1', threshold: [0], value: '3', evaluation_value: 3 }],
        actionGroup: FIRED_ACTIONS.id,
        alertState: 'ERROR',
        reason:
          'Alert is using a malformed KQL query: host.name:(look.there.is.no.space.after.these.parentheses)and uh.oh: "wow that is bad"',
      });
    });
  });

  describe('querying the entire infrastructure with warning threshold', () => {
    const alertID = '*';

    const execute = () =>
      executor({
        ...mockOptions,
        services,
        params: {
          sourceId: 'default',
          criteria: [
            {
              ...baseNonCountCriterion,
              comparator: COMPARATORS.GREATER_THAN,
              threshold: [9.999],
            },
          ],
        },
      });

    const setResults = ({
      comparator = COMPARATORS.GREATER_THAN,
      threshold = [9999],
      warningComparator = COMPARATORS.GREATER_THAN,
      warningThreshold = [2.49],
      metric = 'test.metric.1',
      currentValue = 7.59,
      shouldWarn = false,
    }) =>
      setEvaluationResults([
        {
          '*': {
            ...baseNonCountCriterion,
            comparator,
            threshold,
            warningComparator,
            warningThreshold,
            metric,
            currentValue,
            timestamp: new Date().toISOString(),
            shouldFire: false,
            shouldWarn,
            isNoData: false,
            bucketKey: { groupBy0: '*' },
          },
        },
      ]);

    test('warns as expected with the > comparator', async () => {
      setResults({ warningThreshold: [2.49], currentValue: 2.5, shouldWarn: true });
      await execute();
      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          {
            metric: 'test.metric.1',
            threshold: [9.999],
            formattedThreshold: ['9,999'],
            value: '2.5',
            evaluation_value: 2.5,
          },
        ],
        actionGroup: WARNING_ACTIONS.id,
        alertState: 'WARNING',
        reason: 'test.metric.1 is 2.5 in the last 1 min. Alert when above 2.49.',
        tags: [],
      });

      setResults({ warningThreshold: [2.49], currentValue: 1.23, shouldWarn: false });
      await execute();
      // should not have been called again
      testNAlertsReported(1);
    });

    test('reports expected warning values to the action context for percentage metric', async () => {
      setResults({
        warningThreshold: [0.81],
        currentValue: 0.82,
        shouldWarn: true,
        metric: 'system.cpu.user.pct',
      });
      await execute();

      testNAlertsReported(1);
      testAlertReported(1, {
        id: alertID,
        conditions: [
          {
            metric: 'test.metric.1',
            threshold: [9.999],
            formattedThreshold: ['999,900%'],
            value: '82%',
            evaluation_value: 0.82,
          },
        ],
        actionGroup: WARNING_ACTIONS.id,
        alertState: 'WARNING',
        reason: 'system.cpu.user.pct is 82% in the last 1 min. Alert when above 81%.',
        tags: [],
      });
    });
  });

  function testNAlertsReported(n: number) {
    expect(services.alertsClient.report).toHaveBeenCalledTimes(n);
    expect(services.alertsClient.setAlertData).toHaveBeenCalledTimes(n);
  }

  function testAlertReported(
    index: number,
    {
      id,
      actionGroup,
      alertState,
      groupByKeys,
      group,
      conditions,
      reason,
      tags,
      ecsGroups,
      grouping,
    }: {
      id: string;
      actionGroup: string;
      alertState: string;
      groupByKeys?: any;
      conditions: Array<{
        metric: string;
        threshold: number[];
        formattedThreshold?: Array<number | string>;
        value: string | number;
        evaluation_value?: number | null;
      }>;
      reason: string;
      tags?: string[];
      group?: Group[];
      ecsGroups?: Record<string, string>;
      grouping?: Record<string, any>;
    }
  ) {
    expect(services.alertsClient.report).toHaveBeenNthCalledWith(index, {
      id,
      actionGroup,
    });
    expect(services.alertsClient.setAlertData).toHaveBeenNthCalledWith(index, {
      context: {
        alertDetailsUrl: `http://localhost:5601/app/observability/alerts/uuid-${id}`,
        alertState,
        group: id,
        reason,
        timestamp: mockNow.toISOString(),
        viewInAppUrl: '/metrics-mock',
        metric: conditions.reduce((acc, curr, ndx) => {
          set(acc, `condition${ndx}`, curr.metric);
          return acc;
        }, {}),

        value:
          alertState !== 'ERROR'
            ? conditions.reduce((acc, curr, ndx) => {
                set(acc, `condition${ndx}`, curr.value);
                return acc;
              }, {})
            : null,

        ...(groupByKeys ? { groupByKeys } : {}),

        ...(tags ? { tags } : {}),
        ...(alertState !== 'ERROR'
          ? {
              threshold: conditions.reduce((acc, curr, ndx) => {
                set(
                  acc,
                  `condition${ndx}`,
                  curr.formattedThreshold
                    ? curr.formattedThreshold
                    : curr.threshold.map((t) => String(t))
                );
                return acc;
              }, {}),
            }
          : {}),
        ...(grouping ? { grouping } : {}),
      },
      id,
      payload: {
        ...(alertState !== 'ERROR'
          ? {
              [ALERT_EVALUATION_VALUES]: conditions.map((c) => c.evaluation_value),
              [ALERT_EVALUATION_THRESHOLD]: getThresholds(conditions),
              ...(groupByKeys
                ? group
                  ? {
                      [ALERT_GROUP]: group,
                    }
                  : {
                      [ALERT_GROUP]: Object.keys(groupByKeys).map((key) => ({
                        field: key,
                        value: groupByKeys[key],
                      })),
                    }
                : {}),
            }
          : {}),
        [ALERT_REASON]: reason,
        [ALERT_INDEX_PATTERN]: 'metrics-*,metricbeat-*',
        ...(tags ? { tags } : {}),
        ...(ecsGroups ? ecsGroups : {}),
        ...(grouping ? { [ALERT_GROUPING]: grouping } : {}),
      },
    });
  }
});

const createMockStaticConfiguration = (sources: any): InfraConfig => ({
  alerting: {
    inventory_threshold: {
      group_by_page_size: 100,
    },
    metric_threshold: {
      group_by_page_size: 100,
    },
  },
  inventory: {
    compositeSize: 2000,
  },
  featureFlags: {
    customThresholdAlertsEnabled: false,
    metricsExplorerEnabled: true,
    osqueryEnabled: true,
    inventoryThresholdAlertRuleEnabled: true,
    metricThresholdAlertRuleEnabled: true,
    logThresholdAlertRuleEnabled: true,
    alertsAndRulesDropdownEnabled: true,
    // to be removed in https://github.com/elastic/kibana/issues/221904
    profilingEnabled: false,
    ruleFormV2Enabled: false,
  },
  enabled: true,
  sources,
});

const mockLibs: any = {
  sources: {
    getSourceConfiguration: (savedObjectsClient: any, sourceId: string) => {
      return Promise.resolve({
        id: sourceId,
        configuration: {
          logIndices: {
            type: 'index_pattern',
            indexPatternId: 'some-id',
          },
          metricAlias: 'metrics-*,metricbeat-*',
        },
      });
    },
  },
  configuration: createMockStaticConfiguration({}),
  basePath: {
    publicBaseUrl: 'http://localhost:5601',
    prepend: (path: string) => path,
  },
  plugins: {
    share: {
      setup: sharePluginMock.createSetupContract(),
    },
  },
  logger,
};

const executor = createMetricThresholdExecutor(mockLibs, {
  assetDetailsLocator: mockAssetDetailsLocator,
  metricsExplorerLocator: mockMetricsExplorerLocator,
} as unknown as InfraLocators);

const services = alertsMock.createRuleExecutorServices();
services.savedObjectsClient.get.mockImplementation(async (type: string, sourceId: string) => {
  if (sourceId === 'alternate')
    return {
      id: 'alternate',
      attributes: { metricAlias: 'alternatebeat-*' },
      type,
      references: [],
    };
  if (sourceId === 'empty-response')
    return {
      id: 'empty',
      attributes: { metricAlias: 'empty-response' },
      type,
      references: [],
    };
  return { id: 'default', attributes: { metricAlias: 'metricbeat-*' }, type, references: [] };
});

const baseNonCountCriterion = {
  aggType: Aggregators.AVERAGE,
  metric: 'test.metric.1',
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: COMPARATORS.GREATER_THAN,
} as NonCountMetricExpressionParams;

const baseCountCriterion = {
  aggType: Aggregators.COUNT,
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
  comparator: COMPARATORS.GREATER_THAN,
} as CountMetricExpressionParams;
