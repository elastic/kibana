/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { processResponse } from './get_entities_to_process';

describe('processResponse', () => {
  it('should process response correctly', async () => {
    const mockResponse = {
      took: 4394,
      timed_out: false,
      _shards: { total: 410, successful: 410, skipped: 381, failed: 0 },
      hits: { total: { value: 1609025, relation: 'eq' }, max_score: null, hits: [] },
      aggregations: {
        host: {
          after_key: { 'host.name': 'host-2' },
          buckets: [
            { key: { 'host.name': 'host-1' }, doc_count: 155644 },
            { key: { 'host.name': 'host-2' }, doc_count: 191832 },
          ],
        },
        user: {
          after_key: { 'user.name': 'test-2-user' },
          buckets: [
            { key: { 'user.name': 'test-1-user' }, doc_count: 739 },
            { key: { 'user.name': 'test-2-user' }, doc_count: 1 },
          ],
        },
      },
    };
    expect(processResponse(mockResponse)).toEqual({
      host: {
        afterKey: { 'host.name': 'host-2' },
        values: ['host-1', 'host-2'],
      },
      user: {
        afterKey: { 'user.name': 'test-2-user' },
        values: ['test-1-user', 'test-2-user'],
      },
    });
  });
});
