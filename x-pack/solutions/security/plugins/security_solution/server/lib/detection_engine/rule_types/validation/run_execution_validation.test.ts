/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import type { RuleParams } from '../../rule_schema';
import { getQueryRuleParams, getMlRuleParams, getThreatRuleParams } from '../../rule_schema/mocks';
import { checkForFrozenIndices, hasTimestampFields } from '../utils/utils';
import { runExecutionValidation } from './run_execution_validation';

const mockResolveIndexPatterns = jest.fn();

jest.mock('./resolve_index_patterns', () => ({
  resolveIndexPatterns: (options: { indexPatterns: string[] }) => mockResolveIndexPatterns(options),
}));

jest.mock('../utils/utils', () => ({
  ...jest.requireActual('../utils/utils'),
  hasTimestampFields: jest.fn(),
  checkForFrozenIndices: jest.fn(),
}));

const { hasTimestampFields: actualHasTimestampFields } =
  jest.requireActual<typeof import('../utils/utils')>('../utils/utils');

const NO_MATCHING_INDICES_WARNING =
  'Unable to find matching indices for rule test-rule. This warning will persist until one of the following occurs: a matching index is created or the rule is disabled.';
const NO_MATCHING_THREAT_INDICES_WARNING =
  'Unable to find matching threat indicator indices for rule test-rule. This warning will persist until one of the following occurs: a matching threat index is created or the rule is disabled.';

type FieldCapsFields = Record<string, Record<string, unknown>>;

describe('runExecutionValidation', () => {
  let scopedClusterClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let ruleExecutionLogger: ReturnType<typeof ruleExecutionLogMock.forExecutors.create>;

  const mockMatchedIndices = (fields: FieldCapsFields, indices: string[] = ['auditbeat-1']) => {
    mockResolveIndexPatterns.mockResolvedValue({ matchedIndices: indices, fields });
  };

  const run = ({
    params = getQueryRuleParams(),
    secondaryTimestamp,
    inputIndex = ['auditbeat-*'],
    isServerless = false,
  }: {
    params?: RuleParams;
    secondaryTimestamp?: string;
    inputIndex?: string[];
    isServerless?: boolean;
  } = {}) =>
    runExecutionValidation({
      params,
      inputIndex,
      ruleName: 'test-rule',
      scopedClusterClient,
      runtimeMappings: undefined,
      primaryTimestamp: '@timestamp',
      secondaryTimestamp,
      ruleExecutionLogger,
      isServerless,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveIndexPatterns.mockReset();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
    jest.mocked(hasTimestampFields).mockReturnValue({
      foundNoIndices: false,
      warningMessage: undefined,
    });
    jest.mocked(checkForFrozenIndices).mockResolvedValue([]);
  });

  describe('dateNanosTimestampFields', () => {
    it('collects the primary timestamp when it is mapped as date_nanos', async () => {
      mockMatchedIndices({ '@timestamp': { date_nanos: { type: 'date_nanos' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual(['@timestamp']);
    });

    it('collects a field mixing date and date_nanos mappings', async () => {
      mockMatchedIndices({
        '@timestamp': { date: { type: 'date' }, date_nanos: { type: 'date_nanos' } },
      });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual(['@timestamp']);
      expect(result.mixedTimestampFields).toEqual(['@timestamp']);
    });

    it('collects a field mixing date_nanos and unmapped indices without marking it mixed', async () => {
      mockMatchedIndices({
        '@timestamp': { date: { type: 'date' } },
        'event.ingested': {
          date_nanos: { type: 'date_nanos' },
          unmapped: { type: 'unmapped' },
        },
      });
      const result = await run({ secondaryTimestamp: 'event.ingested' });
      expect(result.dateNanosTimestampFields).toEqual(['event.ingested']);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('collects only the secondary timestamp when it alone is mapped as date_nanos', async () => {
      mockMatchedIndices({
        '@timestamp': { date: { type: 'date' } },
        'event.ingested': { date_nanos: { type: 'date_nanos' } },
      });
      const result = await run({ secondaryTimestamp: 'event.ingested' });
      expect(result.dateNanosTimestampFields).toEqual(['event.ingested']);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is empty when timestamps are mapped as date only', async () => {
      mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual([]);
      expect(result.mixedTimestampFields).toEqual([]);
    });

    it('is empty when the timestamp field is unmapped', async () => {
      mockMatchedIndices({ '@timestamp': { unmapped: { type: 'unmapped' } } });
      const result = await run();
      expect(result.dateNanosTimestampFields).toEqual([]);
    });

    it('is empty for machine learning rules', async () => {
      const result = await run({ params: getMlRuleParams() });
      expect(result.dateNanosTimestampFields).toEqual([]);
      expect(mockResolveIndexPatterns).not.toHaveBeenCalled();
    });
  });

  it('resolves the indices and the timestamp fields with one request', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } });

    const result = await run({ secondaryTimestamp: 'event.ingested' });

    expect(result.skipExecution).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(mockResolveIndexPatterns).toHaveBeenCalledTimes(1);
    expect(mockResolveIndexPatterns).toHaveBeenCalledWith({
      esClient: scopedClusterClient.asCurrentUser,
      indexPatterns: ['auditbeat-*'],
      fields: ['@timestamp', 'event.ingested'],
      runtimeMappings: undefined,
    });
    expect(scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
  });

  it('checks the timestamp fields against the response of that request', async () => {
    const fields = { '@timestamp': { date: { type: 'date' } } };
    mockMatchedIndices(fields, ['auditbeat-1', 'auditbeat-2']);

    await run();

    expect(hasTimestampFields).toHaveBeenCalledTimes(1);
    expect(hasTimestampFields).toHaveBeenCalledWith(
      expect.objectContaining({
        timestampField: '@timestamp',
        timestampFieldCapsResponse: { body: { indices: ['auditbeat-1', 'auditbeat-2'], fields } },
      })
    );
  });

  it('adds the warning for a missing timestamp field', async () => {
    jest.mocked(hasTimestampFields).mockImplementation(actualHasTimestampFields);
    mockMatchedIndices(
      { '@timestamp': { date: { type: 'date' }, unmapped: { indices: ['b-2'] } } },
      ['b-1', 'b-2']
    );

    const result = await run();

    expect(result.skipExecution).toBe(false);
    expect(result.warnings).toEqual([
      'The following indices are missing the timestamp field "@timestamp": ["b-2"]',
    ]);
  });

  it('logs the number of matched indices from the response', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } }, [
      'auditbeat-1',
      'auditbeat-2',
    ]);

    await run();

    expect(ruleExecutionLogger.logMetric).toHaveBeenCalledWith('matched_indices_count', 2);
  });

  it('skips execution when no index matches', async () => {
    mockMatchedIndices({}, []);

    const result = await run();

    expect(result.skipExecution).toBe(true);
    expect(result.warnings).toEqual([NO_MATCHING_INDICES_WARNING]);
    expect(ruleExecutionLogger.logMetric).toHaveBeenCalledWith('matched_indices_count', 0);
    expect(mockResolveIndexPatterns).toHaveBeenCalledTimes(1);
    expect(hasTimestampFields).not.toHaveBeenCalled();
    expect(checkForFrozenIndices).not.toHaveBeenCalled();
  });

  it('does not request the frozen indices when no partially mounted index matched', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } }, [
      'auditbeat-1',
      'my-partial-1',
    ]);

    const result = await run();

    expect(checkForFrozenIndices).not.toHaveBeenCalled();
    expect(result.frozenIndicesQueriedCount).toBe(0);
  });

  it('requests the frozen indices when a partially mounted index matched', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } }, [
      'auditbeat-1',
      'partial-auditbeat-2',
    ]);
    jest.mocked(checkForFrozenIndices).mockResolvedValue(['partial-auditbeat-2']);

    const result = await run();

    expect(checkForFrozenIndices).toHaveBeenCalledTimes(1);
    expect(checkForFrozenIndices).toHaveBeenCalledWith(
      expect.objectContaining({ inputIndices: ['auditbeat-*'] })
    );
    expect(result.frozenIndicesQueriedCount).toBe(1);
  });

  it('does not request the frozen indices on serverless', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } }, ['partial-auditbeat-2']);

    await run({ isServerless: true });

    expect(checkForFrozenIndices).not.toHaveBeenCalled();
  });

  it('passes the index patterns as they are, including the excluding ones', async () => {
    mockMatchedIndices({ '@timestamp': { date: { type: 'date' } } });
    const inputIndex = ['-auditbeat-old-*', 'auditbeat-*', 'filebeat-*'];

    await run({ inputIndex });

    expect(mockResolveIndexPatterns).toHaveBeenCalledWith(
      expect.objectContaining({ indexPatterns: inputIndex })
    );
  });

  it('warns and sends no other request when the request fails', async () => {
    mockResolveIndexPatterns.mockRejectedValue(new Error('boom'));

    const result = await run();

    expect(result).toEqual({
      skipExecution: false,
      warnings: ['Encountered an error validating index patterns: Error: boom'],
      frozenIndicesQueriedCount: 0,
      dateNanosTimestampFields: [],
      mixedTimestampFields: [],
    });
    expect(mockResolveIndexPatterns).toHaveBeenCalledTimes(1);
    expect(scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
    expect(hasTimestampFields).not.toHaveBeenCalled();
    expect(checkForFrozenIndices).not.toHaveBeenCalled();
  });

  describe('indicator match rules', () => {
    const params = getThreatRuleParams({ threatIndex: ['threat-*'] });
    const date = { '@timestamp': { date: { type: 'date' } } };

    it('uses one request for the rule indices and one for the threat indices', async () => {
      mockMatchedIndices(date);

      const result = await run({ params });

      expect(result.skipExecution).toBe(false);
      expect(
        mockResolveIndexPatterns.mock.calls.map(([{ indexPatterns }]) => indexPatterns)
      ).toEqual([['auditbeat-*'], ['threat-*']]);
      expect(scopedClusterClient.asCurrentUser.fieldCaps).not.toHaveBeenCalled();
      expect(hasTimestampFields).toHaveBeenCalledTimes(2);
    });

    it('skips execution when no threat index matches', async () => {
      mockResolveIndexPatterns
        .mockResolvedValueOnce({ matchedIndices: ['auditbeat-1'], fields: date })
        .mockResolvedValueOnce({ matchedIndices: [], fields: {} });

      const result = await run({ params });

      expect(result.skipExecution).toBe(true);
      expect(result.warnings).toEqual([NO_MATCHING_THREAT_INDICES_WARNING]);
      expect(hasTimestampFields).not.toHaveBeenCalled();
      expect(checkForFrozenIndices).not.toHaveBeenCalled();
    });

    it('does not check the threat timestamp fields when no rule index matches', async () => {
      mockResolveIndexPatterns
        .mockResolvedValueOnce({ matchedIndices: [], fields: {} })
        .mockResolvedValueOnce({ matchedIndices: ['threat-1'], fields: {} });

      const result = await run({ params });

      expect(result.skipExecution).toBe(true);
      expect(result.warnings).toEqual([NO_MATCHING_INDICES_WARNING]);
      expect(hasTimestampFields).not.toHaveBeenCalled();
    });

    it('adds the warning for threat indices without the timestamp field', async () => {
      jest.mocked(hasTimestampFields).mockImplementation(actualHasTimestampFields);
      mockResolveIndexPatterns
        .mockResolvedValueOnce({ matchedIndices: ['auditbeat-1'], fields: date })
        .mockResolvedValueOnce({ matchedIndices: ['threat-1'], fields: {} });

      const result = await run({ params });

      expect(result.skipExecution).toBe(false);
      expect(result.warnings).toEqual([
        'The following indices are missing the timestamp field "@timestamp": ["threat-1"]',
      ]);
    });

    it('warns and still checks the rule indices when the threat indices request fails', async () => {
      mockResolveIndexPatterns
        .mockResolvedValueOnce({ matchedIndices: ['auditbeat-1'], fields: date })
        .mockRejectedValueOnce(new Error('boom'));

      const result = await run({ params });

      expect(result.skipExecution).toBe(false);
      expect(result.warnings).toEqual([
        'Encountered an error validating threat index patterns: Error: boom',
      ]);
      expect(mockResolveIndexPatterns).toHaveBeenCalledTimes(2);
      expect(hasTimestampFields).toHaveBeenCalledTimes(1);
    });
  });
});
