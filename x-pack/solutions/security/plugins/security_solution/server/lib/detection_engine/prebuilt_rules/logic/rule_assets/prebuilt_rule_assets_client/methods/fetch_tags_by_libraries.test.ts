/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { fetchTagsByLibraries } from './fetch_tags_by_libraries';

describe('fetchTagsByLibraries', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    savedObjectsClient.search.mockResolvedValue({
      aggregations: {
        tags: { buckets: [{ key: 'Domain: Endpoint' }, { key: 'OS: Linux' }] },
      },
    } as never);
  });

  it('returns the tags of the rules of the libraries', async () => {
    await expect(
      fetchTagsByLibraries(savedObjectsClient, [{ id: 'elastic', version: '9.6.2' }])
    ).resolves.toEqual(['Domain: Endpoint', 'OS: Linux']);
  });

  it('only looks at the rules the given libraries have now, and leaves out deprecated rules', async () => {
    await fetchTagsByLibraries(savedObjectsClient, [
      { id: 'elastic', version: '9.6.2' },
      { id: 'custom', version: 'v1' },
      { id: 'not-synced' },
    ]);

    const [request] = savedObjectsClient.search.mock.calls[0];
    expect(request.size).toBe(0);
    const { filter, must_not: mustNot } = request.query?.bool as {
      filter: Array<{ bool: { should: unknown[] } }>;
      must_not: unknown;
    };
    expect(filter[0].bool.should).toHaveLength(2);
    expect(mustNot).toEqual({ term: { 'security-rule.deprecated': true } });
  });

  it('reads nothing when no library has been synced, instead of reading every library', async () => {
    await expect(fetchTagsByLibraries(savedObjectsClient, [])).resolves.toEqual([]);
    await expect(fetchTagsByLibraries(savedObjectsClient, [{ id: 'new' }])).resolves.toEqual([]);
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });
});
