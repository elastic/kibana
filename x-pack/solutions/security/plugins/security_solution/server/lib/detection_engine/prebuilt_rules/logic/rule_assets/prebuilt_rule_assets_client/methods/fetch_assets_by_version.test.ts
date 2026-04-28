/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import {
  PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP,
  fetchAssetsByVersion,
} from './fetch_assets_by_version';

jest.mock('../../prebuilt_rule_assets_validation', () => ({
  validatePrebuiltRuleAssets: (assets: unknown[]) => assets,
}));

const emptySearchResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
};

const soId = (ruleId: string, version: number) =>
  `${PREBUILT_RULE_ASSETS_SO_TYPE}:${ruleId}_${version}`;

describe('fetchAssetsByVersion', () => {
  let searchMock: jest.Mock;
  let savedObjectsClient: SavedObjectsClientContract;

  beforeEach(() => {
    searchMock = jest.fn().mockResolvedValue(emptySearchResponse);
    savedObjectsClient = {
      search: searchMock,
      getCurrentNamespace: () => 'default',
    } as unknown as SavedObjectsClientContract;
  });

  it('returns early without calling ES when versions is empty', async () => {
    const result = await fetchAssetsByVersion(savedObjectsClient, []);
    expect(result).toEqual({ assets: [] });
    expect(searchMock).not.toHaveBeenCalled();
  });

  it('scopes query to the full versions list and omits post_filter when hitsFilterVersions is not provided', async () => {
    const versions = [
      { rule_id: 'rule-1', version: 1 },
      { rule_id: 'rule-2', version: 1 },
      { rule_id: 'rule-3', version: 1 },
    ];

    await fetchAssetsByVersion(savedObjectsClient, versions);

    expect(searchMock).toHaveBeenCalledTimes(1);
    const call = searchMock.mock.calls[0][0];
    expect(call.query.bool.must).toEqual(
      expect.arrayContaining([
        { terms: { _id: [soId('rule-1', 1), soId('rule-2', 1), soId('rule-3', 1)] } },
      ])
    );
    expect(call.post_filter).toBeUndefined();
  });

  it('passes full-scope soIds in query and page soIds in post_filter when hitsFilterVersions is provided', async () => {
    const versions = [
      { rule_id: 'rule-1', version: 1 },
      { rule_id: 'rule-2', version: 1 },
      { rule_id: 'rule-3', version: 1 },
    ];
    const hitsFilterVersions = [{ rule_id: 'rule-2', version: 1 }];

    await fetchAssetsByVersion(savedObjectsClient, versions, { hitsFilterVersions });

    const call = searchMock.mock.calls[0][0];
    expect(call.query.bool.must).toEqual(
      expect.arrayContaining([
        { terms: { _id: [soId('rule-1', 1), soId('rule-2', 1), soId('rule-3', 1)] } },
      ])
    );
    expect(call.post_filter).toEqual({
      terms: { _id: [soId('rule-2', 1)] },
    });
  });

  it('keeps aggs at the top level (full-scope) while post_filter narrows only the hits', async () => {
    const versions = [
      { rule_id: 'rule-1', version: 1 },
      { rule_id: 'rule-2', version: 1 },
    ];
    const hitsFilterVersions = [{ rule_id: 'rule-1', version: 1 }];
    const aggs = {
      tags: {
        terms: { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags` },
      },
    };

    await fetchAssetsByVersion(savedObjectsClient, versions, { aggs, hitsFilterVersions });

    const call = searchMock.mock.calls[0][0];
    // Aggs are siblings to query/post_filter, so ES runs them over `query`
    // (full set) regardless of `post_filter` (hits page).
    expect(call.aggs).toBe(aggs);
    expect(call.post_filter).toEqual({
      terms: { _id: [soId('rule-1', 1)] },
    });
  });

  it('applies an empty-terms post_filter when hitsFilterVersions is an empty array (matches the "page past the end" handler case)', async () => {
    const versions = [{ rule_id: 'rule-1', version: 1 }];

    await fetchAssetsByVersion(savedObjectsClient, versions, { hitsFilterVersions: [] });

    const call = searchMock.mock.calls[0][0];
    // Empty `hitsFilterVersions` is produced by the handler when `page` is
    // past the end of `installableVersions`. We still emit `post_filter` so
    // the hits page is correctly empty while aggregations keep running over
    // the full set defined by `query`.
    expect(call.post_filter).toEqual({ terms: { _id: [] } });
  });

  it('omits _source when no fields are provided so ES returns the full document', async () => {
    const versions = [{ rule_id: 'rule-1', version: 1 }];

    await fetchAssetsByVersion(savedObjectsClient, versions);

    const call = searchMock.mock.calls[0][0];
    expect(call._source).toBeUndefined();
  });

  it('orders returned assets to match the `versions` argument when ES hits are in a different order', async () => {
    const versions = [
      { rule_id: 'rule-a', version: 1 },
      { rule_id: 'rule-b', version: 1 },
      { rule_id: 'rule-c', version: 1 },
    ];

    const hit = (ruleId: string) => ({
      _source: {
        [PREBUILT_RULE_ASSETS_SO_TYPE]: {
          rule_id: ruleId,
          version: 1,
        },
      },
    });

    searchMock.mockResolvedValue({
      ...emptySearchResponse,
      hits: {
        total: { value: 3, relation: 'eq' },
        max_score: null,
        hits: [hit('rule-c'), hit('rule-a'), hit('rule-b')],
      },
    });

    const { assets } = await fetchAssetsByVersion(savedObjectsClient, versions);

    expect(assets.map((a) => a.rule_id)).toEqual(['rule-a', 'rule-b', 'rule-c']);
  });

  describe('size parameter', () => {
    const buildVersions = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ rule_id: `rule-${i}`, version: 1 }));

    it('defaults size to versions.length when versions.length < cap and no perPage is provided', async () => {
      const versions = buildVersions(7);

      await fetchAssetsByVersion(savedObjectsClient, versions);

      const call = searchMock.mock.calls[0][0];
      expect(call.size).toBe(7);
    });

    it('caps the default size at PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP when versions.length >= cap', async () => {
      const versions = buildVersions(PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP + 25);

      await fetchAssetsByVersion(savedObjectsClient, versions);

      const call = searchMock.mock.calls[0][0];
      expect(call.size).toBe(PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP);
    });

    it('supports perPage when it is provided', async () => {
      const versions = buildVersions(500);

      await fetchAssetsByVersion(savedObjectsClient, versions, { perPage: 500 });

      const call = searchMock.mock.calls[0][0];
      expect(call.size).toBe(500);
    });
  });

  it('sets _source.includes to prefixed requested fields plus the zod baseline plus SO root fields', async () => {
    const versions = [{ rule_id: 'rule-1', version: 1 }];

    await fetchAssetsByVersion(savedObjectsClient, versions, { fields: ['name', 'tags'] });

    const call = searchMock.mock.calls[0][0];
    expect(call._source).toBeDefined();
    const includes: string[] = call._source.includes;

    // Caller-requested, prefixed with the SO type.
    expect(includes).toEqual(expect.arrayContaining(['security-rule.name', 'security-rule.tags']));
    // Baseline that zod validation needs is also sent to ES.
    expect(includes).toEqual(
      expect.arrayContaining([
        'security-rule.rule_id',
        'security-rule.version',
        'security-rule.type',
        'security-rule.description',
        'security-rule.risk_score',
        'security-rule.severity',
      ])
    );
  });
});
