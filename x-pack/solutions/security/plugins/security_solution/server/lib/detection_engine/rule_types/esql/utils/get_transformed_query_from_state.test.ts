/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectMetadataId } from '@kbn/securitysolution-utils';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { validateEsqlQuery } from './validate_esql_query';
import { getTransformedQueryFromState } from './get_transformed_query_from_state';

jest.mock('./validate_esql_query', () => ({
  validateEsqlQuery: jest.fn().mockResolvedValue(true),
}));
jest.mock('@kbn/securitysolution-utils', () => ({
  injectMetadataId: jest.fn(),
}));

const ORIGINAL_QUERY = 'FROM logs*';
const TRANSFORMED_QUERY = 'FROM logs* METADATA _id';

describe('getTransformedQueryFromState', () => {
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  const injectMetadataIdMock = injectMetadataId as jest.Mock;
  const validateEsqlQueryMock = validateEsqlQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    injectMetadataIdMock.mockReturnValue(TRANSFORMED_QUERY);
    validateEsqlQueryMock.mockResolvedValue(true);
  });

  describe('aggregating queries', () => {
    it('returns original query unchanged', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: ORIGINAL_QUERY,
        state: {},
        ruleExecutionLogger,
        isAggregating: true,
      });

      expect(result.query).toBe(ORIGINAL_QUERY);
      expect(result.injectionFailureReason).toBeUndefined();
      expect(injectMetadataIdMock).not.toHaveBeenCalled();
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });
  });

  it('returns saved in state transformedQuery', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {
        transformedQuery: TRANSFORMED_QUERY,
        lastQuery: ORIGINAL_QUERY,
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(TRANSFORMED_QUERY);
    expect(result.injectionFailureReason).toBeUndefined();
    expect(injectMetadataIdMock).not.toHaveBeenCalled();
    expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.trace).toHaveBeenCalledWith(
      'Using state-based transformed ES|QL query'
    );
  });

  it('returns cached failure state without re-parsing or re-validating', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {
        transformedQuery: ORIGINAL_QUERY,
        lastQuery: ORIGINAL_QUERY,
        injectionFailureReason: 'Parse error',
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(ORIGINAL_QUERY);
    expect(result.injectionFailureReason).toBe('Parse error');
    expect(injectMetadataIdMock).not.toHaveBeenCalled();
    expect(validateEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('transforms and validates query on empty state', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(TRANSFORMED_QUERY);
    expect(result.injectionFailureReason).toBeUndefined();
    expect(injectMetadataIdMock).toHaveBeenCalledWith(ORIGINAL_QUERY);
    expect(validateEsqlQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: TRANSFORMED_QUERY })
    );
    expect(ruleExecutionLogger.trace).toHaveBeenCalledWith('Transformed ES|QL query validated');
  });

  it('re-transforms when query changes (stale state)', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {
        transformedQuery: 'FROM old-index* METADATA _id',
        lastQuery: 'FROM old-index*',
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(TRANSFORMED_QUERY);
    expect(injectMetadataIdMock).toHaveBeenCalledWith(ORIGINAL_QUERY);
    expect(validateEsqlQueryMock).toHaveBeenCalled();
  });

  it('skips validation when query is unchanged by transformation', async () => {
    injectMetadataIdMock.mockReturnValue(ORIGINAL_QUERY);

    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(ORIGINAL_QUERY);
    expect(result.injectionFailureReason).toBeUndefined();
    expect(injectMetadataIdMock).toHaveBeenCalledWith(ORIGINAL_QUERY);
    expect(validateEsqlQueryMock).not.toHaveBeenCalled();
  });

  it('falls back to original query with injectionFailureReason when validation fails', async () => {
    validateEsqlQueryMock.mockResolvedValue(false);

    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(ORIGINAL_QUERY);
    expect(result.injectionFailureReason).toBe('Transformed query failed ES|QL validation');
  });

  it('returns original query with injectionFailureReason when injectMetadataId throws', async () => {
    injectMetadataIdMock.mockImplementation(() => {
      throw new Error('Parse error');
    });

    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(ORIGINAL_QUERY);
    expect(result.injectionFailureReason).toBe('Parse error');
    expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to inject METADATA _id')
    );
  });

  it('treats undefined transformedQuery as state miss', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: ORIGINAL_QUERY,
      state: {
        lastQuery: ORIGINAL_QUERY,
        transformedQuery: undefined,
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(TRANSFORMED_QUERY);
    expect(injectMetadataIdMock).toHaveBeenCalled();
    expect(validateEsqlQueryMock).toHaveBeenCalled();
  });
});
