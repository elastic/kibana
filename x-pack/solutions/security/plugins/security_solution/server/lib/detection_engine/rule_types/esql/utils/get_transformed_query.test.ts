/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectMetadataId } from '@kbn/securitysolution-utils';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { validateEsqlQuery } from './validate_esql_query';
import { getTransformedQuery } from './get_transformed_query';

jest.mock('./validate_esql_query', () => ({
  validateEsqlQuery: jest.fn().mockResolvedValue(true),
}));
jest.mock('@kbn/securitysolution-utils', () => ({
  injectMetadataId: jest.fn(),
}));

const ORIGINAL_QUERY = 'FROM logs*';
const TRANSFORMED_QUERY = 'FROM logs* METADATA _id';

describe('getTransformedQuery', () => {
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
      const result = await getTransformedQuery({
        originalQuery: ORIGINAL_QUERY,
        ruleExecutionLogger,
        isAggregating: true,
      });

      expect(result.query).toBe(ORIGINAL_QUERY);
      expect(result.injectionFailureReason).toBeUndefined();
      expect(injectMetadataIdMock).not.toHaveBeenCalled();
      expect(validateEsqlQueryMock).not.toHaveBeenCalled();
    });
  });

  it('transforms and validates query', async () => {
    const result = await getTransformedQuery({
      originalQuery: ORIGINAL_QUERY,
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

  it('skips validation when query is unchanged by transformation', async () => {
    injectMetadataIdMock.mockReturnValue(ORIGINAL_QUERY);

    const result = await getTransformedQuery({
      originalQuery: ORIGINAL_QUERY,
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

    const result = await getTransformedQuery({
      originalQuery: ORIGINAL_QUERY,
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

    const result = await getTransformedQuery({
      originalQuery: ORIGINAL_QUERY,
      ruleExecutionLogger,
      isAggregating: false,
    });

    expect(result.query).toBe(ORIGINAL_QUERY);
    expect(result.injectionFailureReason).toBe('Parse error');
    expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to inject METADATA _id')
    );
  });
});
