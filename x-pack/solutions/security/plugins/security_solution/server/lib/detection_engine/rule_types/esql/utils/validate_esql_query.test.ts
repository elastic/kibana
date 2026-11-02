/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import { validateEsqlQuery } from './validate_esql_query';

describe('validateEsqlQuery', () => {
  const ruleExecutionLogger = ruleExecutionLogMock.forExecutors.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for a valid ES|QL query', async () => {
    const result = await validateEsqlQuery({
      query: 'FROM logs* METADATA _id',
      ruleExecutionLogger,
    });

    expect(result).toBe(true);
    expect(ruleExecutionLogger.warn).not.toHaveBeenCalled();
  });

  it('returns true for a valid query with KEEP and _id', async () => {
    const result = await validateEsqlQuery({
      query: 'FROM logs* METADATA _id | KEEP agent.name, _id',
      ruleExecutionLogger,
    });

    expect(result).toBe(true);
  });

  it('returns true for a valid query with WHERE clause', async () => {
    const result = await validateEsqlQuery({
      query: 'FROM logs* METADATA _id | WHERE agent.name == "test"',
      ruleExecutionLogger,
    });

    expect(result).toBe(true);
  });

  it('returns false and logs warning for a syntactically invalid query', async () => {
    const result = await validateEsqlQuery({
      query: 'INVALID QUERY !!!',
      ruleExecutionLogger,
    });

    expect(result).toBe(false);
    expect(ruleExecutionLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('AST validation failed')
    );
  });

  it('returns true for a query with DROP _id (syntactically valid)', async () => {
    const result = await validateEsqlQuery({
      query: 'FROM logs* METADATA _id | DROP _id',
      ruleExecutionLogger,
    });

    expect(result).toBe(true);
  });
});
