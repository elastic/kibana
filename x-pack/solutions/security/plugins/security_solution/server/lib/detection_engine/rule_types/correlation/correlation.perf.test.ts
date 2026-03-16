/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performance } from 'perf_hooks';

import { v4 as uuidv4 } from 'uuid';

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

import { getCorrelationRuleParams } from '../../rule_schema/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import { correlationExecutor } from './correlation';
import { ALERT_BUILDING_BLOCK_TYPE } from '../../../../../common/field_maps/field_names';
import type { EsqlTable } from '../esql/esql_request';
import type { CorrelationState } from './types';

jest.mock('./compile_correlation_query', () => ({
  compileCorrelationQuery: jest.fn().mockReturnValue('FROM .alerts-security.alerts-default ...'),
  buildEnrichmentIndices: jest.fn().mockReturnValue(['.alerts-security.alerts-default']),
}));

jest.mock('./enrich_building_blocks', () => ({
  fetchContributingAlerts: jest.fn().mockResolvedValue(new Map()),
  extractEnrichmentFields: jest.fn().mockReturnValue({}),
  computeShellEnrichment: jest.fn().mockReturnValue({}),
}));

jest.mock('../esql/esql_request', () => ({
  performEsqlRequest: jest.fn(),
}));

jest.mock('../esql/build_esql_search_request', () => ({
  buildEsqlSearchRequest: jest.fn().mockReturnValue({
    query: 'FROM .alerts-security.alerts-default',
    filter: {},
  }),
}));

jest.mock('../factories', () => ({
  bulkCreate: jest.fn().mockResolvedValue({
    success: true,
    bulkCreateDuration: '100',
    createdItemsCount: 0,
    createdItems: [],
    errors: [],
    alertsWereTruncated: false,
    enrichmentDuration: '0',
  }),
}));

const { performEsqlRequest: mockPerformEsqlRequest } = jest.requireMock('../esql/esql_request') as {
  performEsqlRequest: jest.Mock;
};

const { bulkCreate: mockBulkCreate } = jest.requireMock('../factories') as {
  bulkCreate: jest.Mock;
};

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const uuidMock = uuidv4 as jest.Mock;

const generateMockEsqlResponse = (groupCount: number, alertIdsPerGroup: number) => {
  const columns = [
    { name: 'host.name', type: 'keyword' },
    { name: 'rule_count', type: 'long' },
    { name: 'alert_ids', type: 'keyword' },
    { name: 'rule_names', type: 'keyword' },
    { name: 'max_risk', type: 'double' },
    { name: 'severity_list', type: 'keyword' },
    { name: 'min_time', type: 'date' },
    { name: 'max_time', type: 'date' },
  ];

  const values = Array.from({ length: groupCount }, (_, gi) => [
    `host-${gi}`,
    String(2),
    Array.from({ length: alertIdsPerGroup }, (_x, ai) => `alert-${gi}-${ai}`),
    ['rule-a', 'rule-b'],
    String(75),
    ['high', 'medium'],
    '2024-01-01T00:00:00.000Z',
    '2024-01-01T00:05:00.000Z',
  ]);

  return { columns, values } as unknown as EsqlTable;
};

describe('correlationExecutor performance', () => {
  let ruleServices: PersistenceExecutorOptionsMock;
  let licensing: ReturnType<typeof licensingMock.createSetup>;
  const mockScheduleNotificationResponseActionsService = jest.fn();
  const params = getCorrelationRuleParams();
  const sharedParams = getSharedParamsMock({ ruleParams: params });

  let mockedArguments: Parameters<typeof correlationExecutor>[0];

  beforeEach(() => {
    jest.clearAllMocks();
    licensing = licensingMock.createSetup();
    ruleServices = createPersistenceExecutorOptionsMock();

    let uuidCounter = 0;
    uuidMock.mockImplementation(() => `test-uuid-${uuidCounter++}`);

    mockedArguments = {
      sharedParams,
      services: ruleServices,
      licensing,
      scheduleNotificationResponseActionsService: mockScheduleNotificationResponseActionsService,
      state: {} as CorrelationState,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    { groups: 10, idsPerGroup: 5, label: 'small (50 BBs)' },
    { groups: 50, idsPerGroup: 20, label: 'medium (1k BBs)' },
    { groups: 100, idsPerGroup: 100, label: 'large (10k BBs)' },
    { groups: 100, idsPerGroup: 1000, label: 'extreme (100k BBs)' },
  ])(
    'handles $label volume',
    async ({ groups, idsPerGroup }) => {
      mockPerformEsqlRequest.mockResolvedValueOnce(generateMockEsqlResponse(groups, idsPerGroup));

      const start = performance.now();
      const result = await correlationExecutor(mockedArguments);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(mockBulkCreate).toHaveBeenCalled();

      // eslint-disable-next-line no-console
      console.log(`${groups} groups x ${idsPerGroup} IDs: ${duration.toFixed(1)}ms`);

      expect(duration).toBeLessThan(10000);
    },
    30000
  );

  it('stops processing groups at maxSignals limit', async () => {
    const maxSignals = 100;
    const paramsWithLowMax = getCorrelationRuleParams({ maxSignals });
    const sharedParamsWithLowMax = getSharedParamsMock({ ruleParams: paramsWithLowMax });

    mockPerformEsqlRequest.mockResolvedValueOnce(generateMockEsqlResponse(100, 100));

    const result = await correlationExecutor({
      ...mockedArguments,
      sharedParams: sharedParamsWithLowMax,
    });

    expect(result.success).toBe(true);

    const wrappedAlerts = mockBulkCreate.mock.calls[0][0].wrappedAlerts;
    // Each group produces 1 shell + N building blocks (capped at 500).
    // With maxSignals=100, the first group alone yields 1 + 100 = 101 alerts,
    // which exceeds the limit — so only 1 group should be processed.
    const shellAlerts = wrappedAlerts.filter(
      (a: { _source: Record<string, unknown> }) =>
        a._source[ALERT_BUILDING_BLOCK_TYPE] === undefined
    );
    expect(shellAlerts.length).toBeLessThanOrEqual(2);
  });

  it('caps building blocks per group at MAX_BUILDING_BLOCKS_PER_GROUP', async () => {
    mockPerformEsqlRequest.mockResolvedValueOnce(generateMockEsqlResponse(1, 2000));

    const result = await correlationExecutor(mockedArguments);

    expect(result.success).toBe(true);

    const wrappedAlerts = mockBulkCreate.mock.calls[0][0].wrappedAlerts;
    const buildingBlocks = wrappedAlerts.filter(
      (a: { _source: Record<string, unknown> }) =>
        a._source[ALERT_BUILDING_BLOCK_TYPE] === 'default'
    );
    // MAX_BUILDING_BLOCKS_PER_GROUP = 500
    expect(buildingBlocks.length).toBeLessThanOrEqual(500);
    // 1 shell + at most 500 BBs
    expect(wrappedAlerts.length).toBeLessThanOrEqual(501);
  });

  it('handles empty response quickly', async () => {
    mockPerformEsqlRequest.mockResolvedValueOnce({
      columns: [
        { name: 'host.name', type: 'keyword' },
        { name: 'alert_ids', type: 'keyword' },
        { name: 'max_risk', type: 'keyword' },
      ],
      values: [],
    });

    const start = performance.now();
    const result = await correlationExecutor(mockedArguments);
    const duration = performance.now() - start;

    expect(result.success).toBe(true);
    expect(mockBulkCreate).not.toHaveBeenCalled();
    expect(duration).toBeLessThan(100);
  });
});
