/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { UNGROUPED_FACTORY_KEY } from '../constants';
import { evaluateRule } from './evaluate_rule';
import { getData } from './get_data';
import { checkMissingGroups } from './check_missing_group';

jest.mock('./get_data');
jest.mock('./check_missing_group');

const mockedGetData = getData as jest.MockedFunction<typeof getData>;
const mockedCheckMissingGroups = checkMissingGroups as jest.MockedFunction<
  typeof checkMissingGroups
>;

const logger = { debug: jest.fn() } as unknown as Logger;
const esClient = {} as ElasticsearchClient;

const criterion = {
  metrics: [{ name: 'A', aggType: Aggregators.AVERAGE, field: 'system.cpu.user.pct' }],
  timeSize: 5,
  timeUnit: 'm' as const,
  threshold: [99999],
  comparator: COMPARATORS.GREATER_THAN,
};

const baseParams = {
  criteria: [criterion],
  groupBy: ['host.name'],
  searchConfiguration: {
    index: { title: 'test-*', timeFieldName: '@timestamp' },
    query: { query: '', language: 'kuery' },
  },
};

const esQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: {},
  ignoreFilterIfFieldNotInIndex: false,
};

describe('evaluateRule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('suppresses the redundant * entry when per-group no-data entries coexist', async () => {
    mockedGetData.mockResolvedValue({
      [UNGROUPED_FACTORY_KEY]: {
        value: null,
        trigger: false,
        bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
      },
    });

    mockedCheckMissingGroups.mockResolvedValue([
      { key: 'host-a', bucketKey: { groupBy0: 'host-a' } },
      { key: 'host-b', bucketKey: { groupBy0: 'host-b' } },
    ]);

    const results = await evaluateRule(
      esClient,
      baseParams,
      'test-*',
      undefined,
      '@timestamp',
      100,
      true,
      logger,
      { start: new Date().toISOString(), end: new Date().toISOString() },
      esQueryConfig
    );

    const evaluationKeys = Object.keys(results[0].evaluations);
    expect(evaluationKeys).toContain('host-a');
    expect(evaluationKeys).toContain('host-b');
    expect(evaluationKeys).not.toContain(UNGROUPED_FACTORY_KEY);
  });

  it('preserves the * entry when it is the only no-data result (no missing groups)', async () => {
    mockedGetData.mockResolvedValue({
      [UNGROUPED_FACTORY_KEY]: {
        value: null,
        trigger: false,
        bucketKey: { groupBy0: UNGROUPED_FACTORY_KEY },
      },
    });

    mockedCheckMissingGroups.mockResolvedValue([]);

    const results = await evaluateRule(
      esClient,
      baseParams,
      'test-*',
      undefined,
      '@timestamp',
      100,
      true,
      logger,
      { start: new Date().toISOString(), end: new Date().toISOString() },
      esQueryConfig
    );

    const evaluationKeys = Object.keys(results[0].evaluations);
    expect(evaluationKeys).toEqual([UNGROUPED_FACTORY_KEY]);
  });
});
