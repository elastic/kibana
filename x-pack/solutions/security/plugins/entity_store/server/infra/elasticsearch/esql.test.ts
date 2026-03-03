/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import { esqlResponseToBulkObjects } from './esql';

describe('esqlResponseToBulkObjects', () => {
  it('converts columnar ESQL response to bulk objects with type and doc', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: '@timestamp', type: 'date' },
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ],
      values: [
        ['2024-06-15T12:00:00.000Z', 'host:host-1', 'server-1'],
        ['2024-06-15T12:00:00.000Z', 'host:host-2', 'server-2'],
      ],
    };

    const result = esqlResponseToBulkObjects(response, 'host', []);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      type: 'host',
      doc: {
        '@timestamp': '2024-06-15T12:00:00.000Z',
        'entity.id': 'host:host-1',
        'entity.name': 'server-1',
      },
    });
    expect(result[1]).toEqual({
      type: 'host',
      doc: {
        '@timestamp': '2024-06-15T12:00:00.000Z',
        'entity.id': 'host:host-2',
        'entity.name': 'server-2',
      },
    });
  });

  it('omits fields listed in fieldsToIgnore from each doc', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'entity.EngineMetadata.PaginationFirstSeenLog', type: 'date' },
        { name: 'entity.id', type: 'keyword' },
      ],
      values: [['2024-06-15T10:00:00.000Z', 'user:u1']],
    };

    const result = esqlResponseToBulkObjects(response, 'user', [
      'entity.EngineMetadata.PaginationFirstSeenLog',
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].doc).toEqual({ 'entity.id': 'user:u1' });
    expect(result[0].doc).not.toHaveProperty('entity.EngineMetadata.PaginationFirstSeenLog');
  });

  it('skips null values in each row', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ],
      values: [['host:h1', null]],
    };

    const result = esqlResponseToBulkObjects(response, 'host', []);

    expect(result[0].doc).toEqual({ 'entity.id': 'host:h1' });
    expect(result[0].doc).not.toHaveProperty('entity.name');
  });

  it('returns empty array when values is empty', () => {
    const response: ESQLSearchResponse = {
      columns: [{ name: 'entity.id', type: 'keyword' }],
      values: [],
    };

    const result = esqlResponseToBulkObjects(response, 'host', []);

    expect(result).toEqual([]);
  });

  it('preserves dot-notation keys in doc', () => {
    const response: ESQLSearchResponse = {
      columns: [
        { name: 'entity.id', type: 'keyword' },
        { name: 'entity.name', type: 'keyword' },
      ],
      values: [['user:u1', 'alice']],
    };

    const result = esqlResponseToBulkObjects(response, 'user', []);

    expect(result[0].doc).toEqual({
      'entity.id': 'user:u1',
      'entity.name': 'alice',
    });
  });

  it('uses the provided entity type for every object', () => {
    const response: ESQLSearchResponse = {
      columns: [{ name: 'entity.id', type: 'keyword' }],
      values: [['host:h1'], ['host:h2']],
    };

    const result = esqlResponseToBulkObjects(response, 'host', []);

    expect(result.every((o) => o.type === 'host')).toBe(true);
    expect(result[0].type).toBe('host');
    expect(result[1].type).toBe('host');
  });
});
