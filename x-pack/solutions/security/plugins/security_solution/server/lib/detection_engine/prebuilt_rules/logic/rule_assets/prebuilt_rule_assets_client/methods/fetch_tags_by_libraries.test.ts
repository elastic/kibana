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
    await expect(fetchTagsByLibraries(savedObjectsClient, ['elastic'])).resolves.toEqual([
      'Domain: Endpoint',
      'OS: Linux',
    ]);
  });

  it('only looks at the given libraries, and leaves out deprecated rules', async () => {
    await fetchTagsByLibraries(savedObjectsClient, ['elastic', 'custom']);

    const [request] = savedObjectsClient.search.mock.calls[0];
    expect(request.size).toBe(0);
    expect(request.query).toEqual({
      bool: {
        filter: [{ terms: { 'security-rule.library_id': ['elastic', 'custom'] } }],
        must_not: { term: { 'security-rule.deprecated': true } },
      },
    });
  });

  it('reads nothing when there are no libraries, instead of reading every library', async () => {
    await expect(fetchTagsByLibraries(savedObjectsClient, [])).resolves.toEqual([]);
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });
});
