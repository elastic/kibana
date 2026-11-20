/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { fetchLibraryAssetsPage } from './fetch_library_assets_page';

const TYPE = PREBUILT_RULE_ASSETS_SO_TYPE;

const asset = (ruleId: string) => ({
  rule_id: ruleId,
  version: 1,
  name: ruleId,
  severity: 'low',
  risk_score: 21,
  type: 'query',
  query: 'a',
  language: 'kuery',
  description: 'd',
  library_id: 'lib-1',
});

const searchResponse = (hits: unknown[], total: number) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: total, relation: 'eq' }, max_score: null, hits },
});

describe('fetchLibraryAssetsPage', () => {
  let search: jest.Mock;
  let client: SavedObjectsClientContract;

  const request = (call = 0) => search.mock.calls[call][0];

  beforeEach(() => {
    search = jest.fn().mockResolvedValue(searchResponse([], 0));
    client = {
      search,
      getCurrentNamespace: () => 'default',
    } as unknown as SavedObjectsClientContract;
  });

  it('does not search when no library has been synced', async () => {
    const result = await fetchLibraryAssetsPage(client, {
      libraries: [{ id: 'lib-1' }],
      page: 1,
      perPage: 100,
    });

    expect(result).toEqual({ assets: [], total: 0 });
    expect(search).not.toHaveBeenCalled();
  });

  it('asks for the rules of the release each synced library is at, and leaves out deprecated ones', async () => {
    await fetchLibraryAssetsPage(client, {
      libraries: [{ id: 'lib-1', version: '1.0.0' }, { id: 'lib-2', version: 'v2' }, { id: 'new' }],
      page: 1,
      perPage: 100,
    });

    const { bool } = request().query;
    expect(bool.filter[0]).toEqual({
      bool: {
        should: [
          {
            bool: {
              filter: [
                { term: { [`${TYPE}.library_id`]: 'lib-1' } },
                { term: { [`${TYPE}.library_version`]: '1.0.0' } },
              ],
            },
          },
          {
            bool: {
              filter: [
                { term: { [`${TYPE}.library_id`]: 'lib-2' } },
                { term: { [`${TYPE}.library_version`]: 'v2' } },
              ],
            },
          },
        ],
        minimum_should_match: 1,
      },
    });
    expect(bool.must_not).toEqual({ term: { [`${TYPE}.deprecated`]: true } });
  });

  it('reads one page with from and size, and reports how many rules match in all', async () => {
    search.mockResolvedValue(
      searchResponse([{ _source: { [TYPE]: asset('rule-1') }, sort: [] }], 40006)
    );

    const result = await fetchLibraryAssetsPage(client, {
      libraries: [{ id: 'lib-1', version: '1.0.0' }],
      page: 3,
      perPage: 100,
    });

    expect(search).toHaveBeenCalledTimes(1);
    expect(request()).toEqual(
      expect.objectContaining({ from: 200, size: 100, track_total_hits: true })
    );
    expect(result.total).toBe(40006);
    expect(result.assets.map(({ rule_id: ruleId }) => ruleId)).toEqual(['rule-1']);
  });

  it('applies the filter and the sort, and keeps the order total', async () => {
    await fetchLibraryAssetsPage(client, {
      libraries: [{ id: 'lib-1', version: '1.0.0' }],
      filter: `${TYPE}.attributes.tags: "Linux"`,
      sort: [{ field: 'severity', order: 'desc' }],
      page: 1,
      perPage: 100,
    });

    expect(request().query.bool.filter).toHaveLength(2);
    expect(request().sort).toEqual([
      { [`${TYPE}.severity_rank`]: 'desc' },
      { [`${TYPE}.library_id`]: 'asc' },
      { [`${TYPE}.rule_id`]: 'asc' },
    ]);
  });

  it('does not read whole rules for a page, only the fields asked for', async () => {
    await fetchLibraryAssetsPage(client, {
      libraries: [{ id: 'lib-1', version: '1.0.0' }],
      page: 1,
      perPage: 100,
      fields: ['rule_id', 'name'],
    });

    expect(request()._source.includes).toEqual(
      expect.arrayContaining([`${TYPE}.rule_id`, `${TYPE}.name`])
    );
  });

  describe('a page beyond the first 10,000 rules', () => {
    const hitsOf = (count: number, label: string) =>
      Array.from({ length: count }, (_, index) => ({
        _source: { [TYPE]: asset(`${label}-${index}`) },
        sort: [`${label}-${index}`],
      }));

    it('starts after the rule that comes before it', async () => {
      search
        .mockResolvedValueOnce(searchResponse(hitsOf(10000, 'a'), 40006))
        .mockResolvedValueOnce(searchResponse(hitsOf(10000, 'b'), 40006))
        .mockResolvedValueOnce(searchResponse(hitsOf(100, 'c'), 40006));

      const result = await fetchLibraryAssetsPage(client, {
        libraries: [{ id: 'lib-1', version: '1.0.0' }],
        page: 201,
        perPage: 100,
      });

      expect(search).toHaveBeenCalledTimes(3);
      expect(request(0)).toEqual(expect.objectContaining({ size: 10000, _source: false }));
      expect(request(0).search_after).toBeUndefined();
      expect(request(1).search_after).toEqual(['a-9999']);
      expect(request(2)).toEqual(expect.objectContaining({ size: 100, search_after: ['b-9999'] }));
      expect(request(2).from).toBeUndefined();
      expect(result.assets).toHaveLength(100);
      expect(result.total).toBe(40006);
    });

    it('shows nothing, and the real total, for a page past the last rule', async () => {
      search.mockResolvedValueOnce(searchResponse(hitsOf(500, 'a'), 500));

      const result = await fetchLibraryAssetsPage(client, {
        libraries: [{ id: 'lib-1', version: '1.0.0' }],
        page: 201,
        perPage: 100,
      });

      expect(result).toEqual({ assets: [], total: 500 });
      expect(search).toHaveBeenCalledTimes(1);
    });
  });
});
