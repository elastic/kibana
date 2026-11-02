/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { fetchAssetsByVersion } from './fetch_assets_by_version';

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

  it('scopes query to the versions list', async () => {
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
  });

  it('omits _source when no fields are provided so ES returns the full document', async () => {
    const versions = [{ rule_id: 'rule-1', version: 1 }];

    await fetchAssetsByVersion(savedObjectsClient, versions);

    const call = searchMock.mock.calls[0][0];
    expect(call._source).toBeUndefined();
  });

  describe('result ordering', () => {
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

    it('orders returned assets to match the `versions` argument when no `sort` is provided', async () => {
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

    it('preserves the ES hit order when `sort` is provided', async () => {
      searchMock.mockResolvedValue({
        ...emptySearchResponse,
        hits: {
          total: { value: 3, relation: 'eq' },
          max_score: null,
          hits: [hit('rule-c'), hit('rule-a'), hit('rule-b')],
        },
      });

      const { assets } = await fetchAssetsByVersion(savedObjectsClient, versions, {
        sort: [{ [`${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`]: 'asc' }],
      });

      expect(assets.map((a) => a.rule_id)).toEqual(['rule-c', 'rule-a', 'rule-b']);
    });
  });

  describe('size parameter', () => {
    const buildVersions = (count: number) =>
      Array.from({ length: count }, (_, i) => ({ rule_id: `rule-${i}`, version: 1 }));

    it('defaults size to MAX_PREBUILT_RULES_COUNT when no perPage is provided', async () => {
      const versions = buildVersions(7);

      await fetchAssetsByVersion(savedObjectsClient, versions);

      const call = searchMock.mock.calls[0][0];
      expect(call.size).toBe(MAX_PREBUILT_RULES_COUNT);
    });

    it('does not silently truncate large versions arrays when no perPage is provided', async () => {
      const versions = buildVersions(5000);

      await fetchAssetsByVersion(savedObjectsClient, versions);

      const call = searchMock.mock.calls[0][0];
      expect(call.size).toBe(MAX_PREBUILT_RULES_COUNT);
      expect(call.size).toBeGreaterThanOrEqual(versions.length);
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
