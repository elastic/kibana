/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { EsqlDryRunValidation } from './esql_dry_run_validation';

const createMockScopedClusterClient = (esqlResponse?: unknown, error?: Error) => {
  const mock = {
    asCurrentUser: {
      esql: {
        query: jest.fn(),
      },
    },
    asSecondaryAuthUser: {},
  };

  if (error) {
    mock.asCurrentUser.esql.query.mockRejectedValue(error);
  } else {
    mock.asCurrentUser.esql.query.mockResolvedValue(esqlResponse);
  }

  return mock as any;
};

describe('EsqlDryRunValidation', () => {
  let logger: MockedLogger;

  beforeEach(() => {
    logger = loggerMock.create();
  });

  it('validates a valid ungrouped query', async () => {
    const client = createMockScopedClusterClient({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'numerator', type: 'long' },
        { name: 'denominator', type: 'long' },
      ],
      values: [],
    });

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery:
        'FROM logs-* | STATS numerator = COUNT(*) WHERE status = 200, denominator = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m)',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.columns).toEqual([
      { name: '@timestamp', type: 'date' },
      { name: 'numerator', type: 'long' },
      { name: 'denominator', type: 'long' },
    ]);
  });

  it('validates a valid grouped query', async () => {
    const client = createMockScopedClusterClient({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'numerator', type: 'long' },
        { name: 'denominator', type: 'long' },
        { name: 'host.name', type: 'keyword' },
      ],
      values: [],
    });

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery: 'FROM logs-* | STATS ... BY @timestamp = BUCKET(@timestamp, 1m), host.name',
      groupBy: ['host.name'],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for missing required columns', async () => {
    const client = createMockScopedClusterClient({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'count', type: 'long' },
      ],
      values: [],
    });

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery: 'FROM logs-* | STATS count = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m)',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].code).toBe('MISSING_COLUMN');
    expect(result.errors[0].message).toContain('numerator');
    expect(result.errors[1].code).toBe('MISSING_COLUMN');
    expect(result.errors[1].message).toContain('denominator');
  });

  it('returns errors for wrong column types', async () => {
    const client = createMockScopedClusterClient({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'numerator', type: 'keyword' },
        { name: 'denominator', type: 'long' },
      ],
      values: [],
    });

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery: 'FROM logs-* | STATS ...',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('TYPE_MISMATCH');
    expect(result.errors[0].message).toContain('numerator');
    expect(result.errors[0].message).toContain('keyword');
  });

  it('returns errors for syntax errors', async () => {
    const syntaxError = new Error('ESQL parse error');
    (syntaxError as any).meta = {
      body: { error: { reason: 'line 1:5: mismatched input' } },
    };
    const client = createMockScopedClusterClient(undefined, syntaxError);

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery: 'INVALID QUERY',
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('SYNTAX_ERROR');
    expect(result.errors[0].message).toContain('mismatched input');
  });

  it('returns errors for groupBy mismatch', async () => {
    const client = createMockScopedClusterClient({
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'numerator', type: 'long' },
        { name: 'denominator', type: 'long' },
        { name: 'host', type: 'keyword' },
      ],
      values: [],
    });

    const validator = new EsqlDryRunValidation(client, logger);
    const result = await validator.execute({
      esqlQuery: 'FROM logs-* | STATS ... BY @timestamp = BUCKET(@timestamp, 1m), host',
      groupBy: ['host.name'],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('GROUP_BY_MISMATCH');
    expect(result.errors[0].message).toContain('host.name');
  });
});
