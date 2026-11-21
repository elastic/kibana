/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { fetchRuleCountsByLibrary } from './fetch_rule_counts_by_library';

describe('fetchRuleCountsByLibrary', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  const respondWith = (buckets: Record<string, number>) =>
    savedObjectsClient.search.mockResolvedValue({
      aggregations: {
        libraries: {
          buckets: Object.fromEntries(
            Object.entries(buckets).map(([id, count]) => [id, { doc_count: count }])
          ),
        },
      },
    } as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts the rules each library has now', async () => {
    respondWith({ elastic: 2366, acme: 40000 });

    await expect(
      fetchRuleCountsByLibrary(savedObjectsClient, [
        { id: 'elastic', version: '9.6.2' },
        { id: 'acme', version: '1.0.0' },
      ])
    ).resolves.toEqual({ elastic: 2366, acme: 40000 });
  });

  it('counts each library at its own release, without the deprecated rules', async () => {
    respondWith({ acme: 3 });

    await fetchRuleCountsByLibrary(savedObjectsClient, [{ id: 'acme', version: '1.0.0' }]);

    const request = savedObjectsClient.search.mock.calls[0][0];
    expect(request.query?.bool?.must_not).toEqual({
      term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true },
    });
    expect(request.aggs?.libraries).toEqual({
      filters: {
        filters: {
          acme: {
            bool: {
              should: [
                {
                  bool: {
                    filter: [
                      { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`]: 'acme' } },
                      { term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.library_version`]: '1.0.0' } },
                    ],
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    });
  });

  it('can count the deprecated rules too, which is how the total of a sync counts them', async () => {
    respondWith({ acme: 5 });

    await fetchRuleCountsByLibrary(savedObjectsClient, [{ id: 'acme', version: '1.0.0' }], {
      includeDeprecated: true,
    });

    expect(savedObjectsClient.search.mock.calls[0][0].query?.bool).toEqual({});
  });

  it('does not ask about a library that has not been synced', async () => {
    respondWith({ acme: 3 });

    await fetchRuleCountsByLibrary(savedObjectsClient, [
      { id: 'acme', version: '1.0.0' },
      { id: 'new' },
    ]);

    const { filters } = savedObjectsClient.search.mock.calls[0][0].aggs?.libraries.filters ?? {};
    expect(Object.keys(filters ?? {})).toEqual(['acme']);
  });

  it('reads nothing when no library has been synced', async () => {
    await expect(fetchRuleCountsByLibrary(savedObjectsClient, [{ id: 'new' }])).resolves.toEqual(
      {}
    );
    expect(savedObjectsClient.search).not.toHaveBeenCalled();
  });
});
