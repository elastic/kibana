/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import type { RuleParams } from '../../rule_schema';
import { getQueryRuleParams, getMlRuleParams } from '../../rule_schema/mocks';
import { runExecutionValidation } from './run_execution_validation';

jest.mock('@kbn/data-views-plugin/server', () => ({
  IndexPatternsFetcher: jest.fn().mockImplementation(() => ({
    getIndexPatternMatches: jest.fn().mockResolvedValue({
      matchedIndexPatterns: ['auditbeat-*'],
      matchedIndices: ['auditbeat-1'],
    }),
  })),
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  hasTimestampFields: jest.fn().mockResolvedValue({ warningMessage: undefined }),
  checkForFrozenIndices: jest.fn().mockResolvedValue([]),
}));

describe('runExecutionValidation', () => {
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;

  const mockFieldCaps = (fields: Record<string, Record<string, unknown>>) => {
    scopedClusterClient.asCurrentUser.fieldCaps.mockResolvedValue({
      body: { indices: ['auditbeat-1'], fields },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  };

  const run = (
    params: RuleParams = getQueryRuleParams(),
    secondaryTimestamp: string | undefined = undefined
  ) =>
    runExecutionValidation({
      params,
      inputIndex: ['auditbeat-*'],
      ruleName: 'test-rule',
      scopedClusterClient,
      runtimeMappings: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp,
      ruleExecutionLogger,
      isServerless: false,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  });

  describe('dateNanosTimestampFields', () => {
    it('collects the primary timestamp when it is mapped as date_nanos', async () => {
      mockFieldCaps({ '@timestamp': { date_nanos: { type: 'date_nanos' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual(['@timestamp']);
    });

    it('collects a field mixing date and date_nanos mappings', async () => {
      mockFieldCaps({
        '@timestamp': { date: { type: 'date' }, date_nanos: { type: 'date_nanos' } },
      });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual(['@timestamp']);
      expect(result.mixedTimestampFields).toEqual(['@timestamp']);
    });

    it('collects a field mixing date_nanos and unmapped indices without marking it mixed', async () => {
      mockFieldCaps({
        '@timestamp': { date: { type: 'date' } },
        'event.ingested': {
          date_nanos: { type: 'date_nanos' },
          unmapped: { type: 'unmapped' },
        },
      });
      const result = await run(getQueryRuleParams(), 'event.ingested');
      expect(result.dateNanosTimestampFields).toEqual(['event.ingested']);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('collects only the secondary timestamp when it alone is mapped as date_nanos', async () => {
      mockFieldCaps({
        '@timestamp': { date: { type: 'date' } },
        'event.ingested': { date_nanos: { type: 'date_nanos' } },
      });
      const result = await run(getQueryRuleParams(), 'event.ingested');
      expect(result.dateNanosTimestampFields).toEqual(['event.ingested']);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is empty when timestamps are mapped as date only', async () => {
      mockFieldCaps({ '@timestamp': { date: { type: 'date' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual([]);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is empty when the timestamp field is unmapped', async () => {
      mockFieldCaps({ '@timestamp': { unmapped: { type: 'unmapped' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual([]);
    });

    it('is empty when the fieldCaps request fails', async () => {
      scopedClusterClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual([]);
      expect(result.warnings).toEqual([
        expect.stringContaining('Timestamp fields check failed to execute'),
      ]);
    });

    it('is empty for machine learning rules', async () => {
      const result = await run(getMlRuleParams());
      expect(result.dateNanosTimestampFields).toEqual([]);
      expect(scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    });
  });
});
