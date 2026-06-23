/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  parseDateString,
  validateHistoryWindowStart,
  transformBucketsToValues,
  hasCrossClusterIndices,
  hasFieldsWithUnsupportedEsqlTypes,
} from './utils';

describe('new terms utils', () => {
  describe('parseDateString', () => {
    test('should correctly parse a static date', () => {
      const date = '2022-08-04T16:31:18.000Z';
      // forceNow shouldn't matter when we give a static date
      const forceNow = new Date();
      const parsedDate = parseDateString({ date, forceNow });
      expect(parsedDate.toISOString()).toEqual(date);
    });

    test('should correctly parse a relative date', () => {
      const date = 'now-5m';
      const forceNow = new Date('2022-08-04T16:31:18.000Z');
      const parsedDate = parseDateString({ date, forceNow });
      expect(parsedDate.toISOString()).toEqual('2022-08-04T16:26:18.000Z');
    });

    test(`should throw an error without a name if the string can't be parsed as a date`, () => {
      const date = 'notValid';
      const forceNow = new Date();
      expect(() => parseDateString({ date, forceNow })).toThrowError(
        `Failed to parse 'date string'`
      );
    });

    test(`should throw an error with a name if the string can't be parsed as a date`, () => {
      const date = 'notValid';
      const forceNow = new Date();
      expect(() => parseDateString({ date, forceNow, name: 'historyWindowStart' })).toThrowError(
        `Failed to parse 'historyWindowStart'`
      );
    });
  });

  describe('validateHistoryWindowStart', () => {
    test('should not throw if historyWindowStart is earlier than from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-6m';
      validateHistoryWindowStart({ historyWindowStart, from });
    });

    test('should throw if historyWindowStart is equal to from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-7m';
      expect(() => validateHistoryWindowStart({ historyWindowStart, from })).toThrowError(
        `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
      );
    });

    test('should throw if historyWindowStart is later than from', () => {
      const historyWindowStart = 'now-7m';
      const from = 'now-8m';
      expect(() => validateHistoryWindowStart({ historyWindowStart, from })).toThrowError(
        `History window size is smaller than rule interval + additional lookback, 'historyWindowStart' must be earlier than 'from'`
      );
    });
  });

  describe('transformBucketsToValues', () => {
    it('should return correct value for a single new terms field', () => {
      expect(
        transformBucketsToValues(
          ['source.host'],
          [
            {
              key: {
                'source.host': 'host-0',
              },
              doc_count: 1,
            },
            {
              key: {
                'source.host': 'host-1',
              },
              doc_count: 3,
            },
          ]
        )
      ).toEqual(['host-0', 'host-1']);
    });

    it('should filter null values for a single new terms field', () => {
      expect(
        transformBucketsToValues(
          ['source.host'],
          [
            {
              key: {
                'source.host': 'host-0',
              },
              doc_count: 1,
            },
            {
              key: {
                'source.host': null,
              },
              doc_count: 3,
            },
          ]
        )
      ).toEqual(['host-0']);
    });

    // TODO: write test for multiple fields?
  });
});

describe('hasCrossClusterIndices', () => {
  it('returns false for local-only indices', () => {
    expect(hasCrossClusterIndices(['logs-*'])).toBe(false);
  });

  it('returns true when a cross-cluster index is present', () => {
    expect(hasCrossClusterIndices(['remote:logs-*'])).toBe(true);
  });

  it('returns false for an empty array', () => {
    expect(hasCrossClusterIndices([])).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(hasCrossClusterIndices(undefined)).toBe(false);
  });

  it('returns true for a colon-containing pattern mixed with local ones', () => {
    expect(hasCrossClusterIndices(['logs-*', 'remote:logs-*'])).toBe(true);
  });

  it('returns true when the index name contains a colon anywhere', () => {
    expect(hasCrossClusterIndices(['logs:special'])).toBe(true);
  });
});

describe('hasFieldsWithUnsupportedEsqlTypes', () => {
  const createEsClientMock = (fields: Record<string, unknown>) =>
    ({
      fieldCaps: jest.fn().mockResolvedValue({ fields }),
    } as unknown as ElasticsearchClient);

  it('returns false when all fields are keyword', async () => {
    const esClient = createEsClientMock({
      'user.name': { keyword: { type: 'keyword', searchable: true } },
    });

    const result = await hasFieldsWithUnsupportedEsqlTypes({
      esClient,
      index: ['logs-*'],
      fields: ['user.name'],
    });

    expect(result).toBe(false);
  });

  it('returns true when a field is flattened', async () => {
    const esClient = createEsClientMock({
      labels: { flattened: { type: 'flattened', searchable: true } },
    });

    const result = await hasFieldsWithUnsupportedEsqlTypes({
      esClient,
      index: ['logs-*'],
      fields: ['labels'],
    });

    expect(result).toBe(true);
  });

  it('returns true when a field is nested', async () => {
    const esClient = createEsClientMock({
      nested_field: { nested: { type: 'nested' } },
    });

    const result = await hasFieldsWithUnsupportedEsqlTypes({
      esClient,
      index: ['logs-*'],
      fields: ['nested_field'],
    });

    expect(result).toBe(true);
  });

  it('returns true when the root of a dotted subfield is flattened', async () => {
    const esClient = createEsClientMock({
      labels: { flattened: { type: 'flattened', searchable: true } },
    });

    const result = await hasFieldsWithUnsupportedEsqlTypes({
      esClient,
      index: ['logs-*'],
      fields: ['labels.env'],
    });

    expect(result).toBe(true);
  });

  it('queries both the dotted field and its root', async () => {
    const esClient = createEsClientMock({
      'labels.env': { keyword: { type: 'keyword' } },
      labels: { keyword: { type: 'keyword' } },
    });

    await hasFieldsWithUnsupportedEsqlTypes({
      esClient,
      index: ['logs-*'],
      fields: ['labels.env'],
    });

    const fieldCapsMock = esClient.fieldCaps as jest.Mock;
    const calledFields = fieldCapsMock.mock.calls[0][0].fields;
    expect(calledFields).toContain('labels.env');
    expect(calledFields).toContain('labels');
  });
});
