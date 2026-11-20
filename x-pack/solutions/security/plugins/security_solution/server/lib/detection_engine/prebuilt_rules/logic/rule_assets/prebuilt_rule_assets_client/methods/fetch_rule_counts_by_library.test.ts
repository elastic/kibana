/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { fetchRuleCountsByLibrary } from './fetch_rule_counts_by_library';

describe('fetchRuleCountsByLibrary', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  const respondWith = (buckets: unknown) =>
    savedObjectsClient.search.mockResolvedValue({
      aggregations: { libraries: { buckets } },
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts the distinct rules of each library without the deprecated ones', async () => {
    respondWith([
      { key: 'elastic', rules: { value: 2499 }, deprecated: { rules: { value: 133 } } },
      { key: 'elastic-community', rules: { value: 10 }, deprecated: { rules: { value: 0 } } },
    ]);

    await expect(fetchRuleCountsByLibrary(savedObjectsClient)).resolves.toEqual({
      elastic: 2366,
      'elastic-community': 10,
    });
  });

  it('returns no counts when there are no libraries with rules', async () => {
    respondWith([]);

    await expect(fetchRuleCountsByLibrary(savedObjectsClient)).resolves.toEqual({});
  });

  it('asks for distinct rule_ids, not documents', async () => {
    respondWith([]);

    await fetchRuleCountsByLibrary(savedObjectsClient);

    const [request] = savedObjectsClient.search.mock.calls[0];
    expect(request.size).toBe(0);
    expect(JSON.stringify(request.aggs)).toContain('cardinality');
  });
});
