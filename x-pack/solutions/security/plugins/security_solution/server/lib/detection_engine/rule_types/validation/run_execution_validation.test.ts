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

  describe('hasDateNanosTimestampFields', () => {
    it('is true when the primary timestamp is mapped as date_nanos', async () => {
      mockFieldCaps({ '@timestamp': { date_nanos: { type: 'date_nanos' } } });
      const result = await run();
      expect(result.hasDateNanosTimestampFields).toBe(true);
    });

    it('is true when date and date_nanos mappings are mixed', async () => {
      mockFieldCaps({
        '@timestamp': { date: { type: 'date' }, date_nanos: { type: 'date_nanos' } },
      });
      const result = await run();
      expect(result.hasDateNanosTimestampFields).toBe(true);
      expect(result.mixedTimestampFields).toEqual(['@timestamp']);
    });

    it('is true when only the secondary timestamp is mapped as date_nanos', async () => {
      mockFieldCaps({
        '@timestamp': { date: { type: 'date' } },
        'event.ingested': { date_nanos: { type: 'date_nanos' } },
      });
      const result = await run(getQueryRuleParams(), 'event.ingested');
      expect(result.hasDateNanosTimestampFields).toBe(true);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is false when timestamps are mapped as date only', async () => {
      mockFieldCaps({ '@timestamp': { date: { type: 'date' } } });
      const result = await run();
      expect(result.hasDateNanosTimestampFields).toBe(false);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is false when the timestamp field is unmapped', async () => {
      mockFieldCaps({ '@timestamp': { unmapped: { type: 'unmapped' } } });
      const result = await run();
      expect(result.hasDateNanosTimestampFields).toBe(false);
    });

    it('is false when the fieldCaps request fails', async () => {
      scopedClusterClient.asCurrentUser.fieldCaps.mockRejectedValue(new Error('boom'));
      const result = await run();
      expect(result.hasDateNanosTimestampFields).toBe(false);
      expect(result.warnings).toEqual([
        expect.stringContaining('Timestamp fields check failed to execute'),
      ]);
    });

    it('is false for machine learning rules', async () => {
      const result = await run(getMlRuleParams());
      expect(result.hasDateNanosTimestampFields).toBe(false);
      expect(scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    });
  });
});
