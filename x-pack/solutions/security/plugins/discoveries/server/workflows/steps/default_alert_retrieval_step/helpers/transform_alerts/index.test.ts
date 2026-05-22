/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import {
  convertEsqlRowToRawData,
  ensureRequiredAnonymizationFields,
  getAnonymizedAlertsFromEsql,
} from '.';

jest.mock('@kbn/elastic-assistant-common', () => ({
  getAnonymizedValue: jest.fn((value: unknown) => String(value)),
  getRawDataOrDefault: jest.fn((data: unknown) => data),
  transformRawData: jest.fn(({ rawData }: { rawData: Record<string, unknown[]> }) =>
    Object.entries(rawData)
      .map(([k, v]) => `${k},${v[0] ?? ''}`)
      .join(',')
  ),
}));

describe('convertEsqlRowToRawData', () => {
  it('maps column names to arrays of values', () => {
    const result = convertEsqlRowToRawData({
      columns: [{ name: 'host.name' }, { name: 'user.name' }],
      row: ['server-1', 'admin'],
    });

    expect(result).toEqual({
      'host.name': ['server-1'],
      'user.name': ['admin'],
    });
  });

  it('uses column_N fallback when name is undefined', () => {
    const result = convertEsqlRowToRawData({
      columns: [{ name: undefined }],
      row: ['value'],
    });

    expect(result).toEqual({ column_0: ['value'] });
  });

  it('stores empty array for null values', () => {
    const result = convertEsqlRowToRawData({
      columns: [{ name: 'host.name' }],
      row: [null],
    });

    expect(result).toEqual({ 'host.name': [] });
  });

  it('stores empty array for undefined values', () => {
    const result = convertEsqlRowToRawData({
      columns: [{ name: 'host.name' }],
      row: [undefined],
    });

    expect(result).toEqual({ 'host.name': [] });
  });

  it('handles empty columns and row', () => {
    const result = convertEsqlRowToRawData({ columns: [], row: [] });

    expect(result).toEqual({});
  });
});

describe('ensureRequiredAnonymizationFields', () => {
  it('returns fields unchanged when _id is already present', () => {
    const fields: AnonymizationFieldResponse[] = [
      { allowed: true, anonymized: false, field: '_id', id: 'existing-id' },
      { allowed: true, anonymized: true, field: 'host.name', id: 'field-2' },
    ];

    const result = ensureRequiredAnonymizationFields(fields);

    expect(result).toBe(fields);
  });

  it('prepends _id field when missing', () => {
    const fields: AnonymizationFieldResponse[] = [
      { allowed: true, anonymized: true, field: 'host.name', id: 'field-1' },
    ];

    const result = ensureRequiredAnonymizationFields(fields);

    expect(result[0]).toEqual({
      allowed: true,
      anonymized: false,
      field: '_id',
      id: 'field-_id',
    });
  });

  it('preserves existing fields when prepending _id', () => {
    const fields: AnonymizationFieldResponse[] = [
      { allowed: true, anonymized: true, field: 'host.name', id: 'field-1' },
    ];

    const result = ensureRequiredAnonymizationFields(fields);

    expect(result).toHaveLength(2);
    expect(result[1]).toEqual(fields[0]);
  });

  it('returns empty array unchanged when no fields provided', () => {
    const result = ensureRequiredAnonymizationFields([]);

    expect(result[0]).toEqual({
      allowed: true,
      anonymized: false,
      field: '_id',
      id: 'field-_id',
    });
    expect(result).toHaveLength(1);
  });
});

describe('getAnonymizedAlertsFromEsql', () => {
  const mockEsClient = {
    esql: { query: jest.fn() },
  } as unknown as ElasticsearchClient;

  const anonymizationFields: AnonymizationFieldResponse[] = [
    { allowed: true, anonymized: false, field: 'host.name', id: 'f1' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls esql.query with the provided query', async () => {
    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [],
      values: [],
    });

    await getAnonymizedAlertsFromEsql({
      anonymizationFields,
      esClient: mockEsClient,
      esqlQuery: 'FROM .alerts | LIMIT 10',
    });

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'FROM .alerts | LIMIT 10' })
    );
  });

  it('returns one string per row', async () => {
    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'host.name' }],
      values: [['server-1'], ['server-2']],
    });

    const result = await getAnonymizedAlertsFromEsql({
      anonymizationFields,
      esClient: mockEsClient,
      esqlQuery: 'FROM .alerts | LIMIT 10',
    });

    expect(result).toHaveLength(2);
  });

  it('returns empty array when there are no rows', async () => {
    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'host.name' }],
      values: [],
    });

    const result = await getAnonymizedAlertsFromEsql({
      anonymizationFields,
      esClient: mockEsClient,
      esqlQuery: 'FROM .alerts | LIMIT 10',
    });

    expect(result).toEqual([]);
  });

  it('calls onNewReplacements when replacements are updated', async () => {
    const { transformRawData: mockTransformRawData } = jest.requireMock(
      '@kbn/elastic-assistant-common'
    );
    mockTransformRawData.mockImplementation(
      ({ onNewReplacements: cb }: { onNewReplacements: (r: Record<string, string>) => void }) => {
        cb({ 'server-1': 'SERVER_001' });
        return 'anonymized';
      }
    );

    (mockEsClient.esql.query as jest.Mock).mockResolvedValue({
      columns: [{ name: 'host.name' }],
      values: [['server-1']],
    });

    const onNewReplacements = jest.fn();

    await getAnonymizedAlertsFromEsql({
      anonymizationFields,
      esClient: mockEsClient,
      esqlQuery: 'FROM .alerts',
      onNewReplacements,
    });

    expect(onNewReplacements).toHaveBeenCalledWith({ 'server-1': 'SERVER_001' });
  });
});
