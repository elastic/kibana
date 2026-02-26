/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { validateEsqlQuery } from './validate_esql_query';
import { getTransformedQueryFromState } from './get_transformed_query_from_state';
import { injectMetadataId } from '@kbn/securitysolution-utils';

jest.mock('./validate_esql_query', () => ({
  validateEsqlQuery: jest.fn().mockResolvedValue(true),
}));
jest.mock('@kbn/securitysolution-utils', () => {
  const actual = jest.requireActual('@kbn/securitysolution-utils');
  return {
    ...actual,
    injectMetadataId: jest.fn().mockImplementation(actual.injectMetadataId),
  };
});

describe('getTransformedQueryFromState', () => {
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();
  const validateEsqlQueryMock = validateEsqlQuery as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    validateEsqlQueryMock.mockResolvedValue(true);
  });

  describe('aggregating queries', () => {
    it('returns original query unchanged', async () => {
      const query = 'FROM logs* | STATS count(*) BY host';
      const result = await getTransformedQueryFromState({
        originalQuery: query,
        state: {},
        ruleExecutionLogger,
        isAggregating: true,
      });

      expect(result).toBe(query);
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });

    it('skips state lookup for aggregating queries', async () => {
      const query = 'FROM logs* | STATS count(*) BY host';
      const result = await getTransformedQueryFromState({
        originalQuery: query,
        state: {
          transformedQuery: 'SOMETHING stateD',
          lastQuery: query,
        },
        ruleExecutionLogger,
        isAggregating: true,
      });

      expect(result).toBe(query);
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });
  });

  it('returns saved in state transformedQuery', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: 'FROM logs*',
      state: {
        transformedQuery: 'FROM logs* METADATA _id',
        lastQuery: 'FROM logs*',
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('FROM logs* METADATA _id');
    expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    expect(ruleExecutionLogger.trace).toHaveBeenCalledWith(
      'Using state-based transformed ES|QL query'
    );
  });

  it('transforms and validates query on empty state', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: 'FROM logs*',
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('FROM logs* METADATA _id');
    expect(validateEsqlQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM logs* METADATA _id' })
    );
    expect(ruleExecutionLogger.trace).toHaveBeenCalledWith('Transformed ES|QL query validated');
  });

  it('re-transforms when query changes (stale state)', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: 'FROM logs* | WHERE x > 5',
      state: {
        transformedQuery: 'FROM old-index* METADATA _id',
        lastQuery: 'FROM old-index*',
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('FROM logs* METADATA _id | WHERE x > 5');
    expect(validateEsqlQueryMock).toHaveBeenCalled();
  });

  it('falls back to original query when validation fails', async () => {
    validateEsqlQueryMock.mockResolvedValue(false);

    const result = await getTransformedQueryFromState({
      originalQuery: 'FROM logs*',
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('FROM logs*');
  });

  it('returns original query when injectMetadataId throws', async () => {
    (injectMetadataId as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Parse error');
    });

    const result = await getTransformedQueryFromState({
      originalQuery: 'INVALID QUERY!!!',
      state: {},
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('INVALID QUERY!!!');
    expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to inject METADATA _id')
    );
  });

  it('treats undefined transformedQuery as state miss', async () => {
    const result = await getTransformedQueryFromState({
      originalQuery: 'FROM logs*',
      state: {
        lastQuery: 'FROM logs*',
        transformedQuery: undefined,
      },
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result).toBe('FROM logs* METADATA _id');
    expect(validateEsqlQueryMock).toHaveBeenCalled();
  });
});
