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
      });

      expect(result).toBe(query);
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });

    it('skips cache lookup for aggregating queries', async () => {
      const query = 'FROM logs* | STATS count(*) BY host';
      const result = await getTransformedQueryFromState({
        originalQuery: query,
        state: {
          transformedQuery: 'SOMETHING CACHED',
          lastQuery: query,
        },
        ruleExecutionLogger,
      });

      expect(result).toBe(query);
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });
  });

  describe('cache hit', () => {
    it('returns cached transformedQuery when source matches', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs*',
        state: {
          transformedQuery: 'FROM logs* METADATA _id',
          lastQuery: 'FROM logs*',
        },
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* METADATA _id');
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
      expect(ruleExecutionLogger.trace).toHaveBeenCalledWith(
        'Using state-based transformed ES|QL query'
      );
    });

    it('does not call validateEsqlQuery on cache hit', async () => {
      await getTransformedQueryFromState({
        originalQuery: 'FROM logs* | WHERE x > 1',
        state: {
          transformedQuery: 'FROM logs* METADATA _id | WHERE x > 1',
          lastQuery: 'FROM logs* | WHERE x > 1',
        },
        ruleExecutionLogger,
      });

      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });
  });

  describe('cache miss', () => {
    it('transforms and validates query on empty state', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs*',
        state: {},
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* METADATA _id');
      expect(validateEsqlQueryMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'FROM logs* METADATA _id',
          ruleExecutionLogger,
        })
      );
    });

    it('transforms and validates query when source differs', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs* | WHERE x > 5',
        state: {
          transformedQuery: 'FROM old-index* METADATA _id',
          lastQuery: 'FROM old-index*',
        },
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* METADATA _id | WHERE x > 5');
      expect(validateEsqlQueryMock).toHaveBeenCalled();
    });
  });

  describe('AST validation', () => {
    it('returns transformed query when validation passes', async () => {
      validateEsqlQueryMock.mockResolvedValue(true);

      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs*',
        state: {},
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* METADATA _id');
      expect(ruleExecutionLogger.trace).toHaveBeenCalledWith('Transformed ES|QL query validated');
    });

    it('falls back to original query when validation fails', async () => {
      validateEsqlQueryMock.mockResolvedValue(false);

      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs*',
        state: {},
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs*');
    });

    it('falls back to original query when validation fails for complex query', async () => {
      validateEsqlQueryMock.mockResolvedValue(false);

      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs* | DROP _id | KEEP agent.name',
        state: {},
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* | DROP _id | KEEP agent.name');
    });
  });

  describe('error handling', () => {
    it('returns original query when injectMetadataId throws', async () => {
      (injectMetadataId as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Parse error');
      });

      const result = await getTransformedQueryFromState({
        originalQuery: 'INVALID QUERY!!!',
        state: {},
        ruleExecutionLogger,
      });

      expect(result).toBe('INVALID QUERY!!!');
      expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to inject METADATA _id')
      );
    });
  });

  describe('state transitions', () => {
    it('invalidates cache when query changes', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM new-logs*',
        state: {
          transformedQuery: 'FROM old-logs* METADATA _id',
          lastQuery: 'FROM old-logs*',
        },
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM new-logs* METADATA _id');
      expect(validateEsqlQueryMock).toHaveBeenCalled();
    });

    it('treats undefined transformedQuery as cache miss', async () => {
      const result = await getTransformedQueryFromState({
        originalQuery: 'FROM logs*',
        state: {
          lastQuery: 'FROM logs*',
          transformedQuery: undefined,
        },
        ruleExecutionLogger,
      });

      expect(result).toBe('FROM logs* METADATA _id');
      expect(validateEsqlQueryMock).toHaveBeenCalled();
    });
  });
});
