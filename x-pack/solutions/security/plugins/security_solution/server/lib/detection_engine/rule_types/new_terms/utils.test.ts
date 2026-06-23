/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { hasCrossClusterIndices, hasFieldsWithUnsupportedEsqlTypes } from './utils';

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
