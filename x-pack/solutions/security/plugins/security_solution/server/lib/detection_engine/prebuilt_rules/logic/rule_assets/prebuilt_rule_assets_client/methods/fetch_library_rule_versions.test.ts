/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { fetchLibraryRuleVersions } from './fetch_library_rule_versions';

const TYPE = PREBUILT_RULE_ASSETS_SO_TYPE;

const hit = (ruleId: string, sort: unknown[]) => ({
  _source: { [TYPE]: { rule_id: ruleId, version: 2, type: 'query', library_id: 'lib-1' } },
  sort,
});

const response = (hits: unknown[]) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: hits.length, relation: 'eq' }, max_score: null, hits },
});

describe('fetchLibraryRuleVersions', () => {
  let search: jest.Mock;
  let client: SavedObjectsClientContract;

  beforeEach(() => {
    search = jest.fn();
    client = {
      search,
      getCurrentNamespace: () => 'default',
    } as unknown as SavedObjectsClientContract;
  });

  it('does not search when no library has been synced', async () => {
    await expect(fetchLibraryRuleVersions(client, [{ id: 'lib-1' }])).resolves.toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('returns the rule, version, type and library of each rule the library has now', async () => {
    search.mockResolvedValue(response([hit('a', ['lib-1', 'a'])]));

    const result = await fetchLibraryRuleVersions(client, [{ id: 'lib-1', version: '1.0.0' }]);

    expect(result).toEqual([{ rule_id: 'a', version: 2, type: 'query', library_id: 'lib-1' }]);
    const [request] = search.mock.calls[0];
    expect(request.query.bool.must_not).toEqual({ term: { [`${TYPE}.deprecated`]: true } });
  });

  it('reads on page by page until there are no more rules, so a large library is not cut off', async () => {
    const fullPage = Array.from({ length: 5000 }, (_, i) => hit(`a-${i}`, ['lib-1', `a-${i}`]));
    search
      .mockResolvedValueOnce(response(fullPage))
      .mockResolvedValueOnce(response(fullPage))
      .mockResolvedValueOnce(response([hit('last', ['lib-1', 'last'])]));

    const result = await fetchLibraryRuleVersions(client, [{ id: 'lib-1', version: '1.0.0' }]);

    expect(result).toHaveLength(10001);
    expect(search).toHaveBeenCalledTimes(3);
    expect(search.mock.calls[0][0].search_after).toBeUndefined();
    expect(search.mock.calls[1][0].search_after).toEqual(['lib-1', 'a-4999']);
  });
});
