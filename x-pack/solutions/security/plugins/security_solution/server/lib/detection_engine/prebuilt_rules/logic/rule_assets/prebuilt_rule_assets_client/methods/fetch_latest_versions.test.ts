/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { prepareQueryDslFilter } from '../utils';
import { fetchLatestVersions } from './fetch_latest_versions';

const aggResponse = (ruleId: string, version: number) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    rules: {
      buckets: [
        {
          key: ruleId,
          latest_version: {
            hits: {
              hits: [
                {
                  _source: {
                    [PREBUILT_RULE_ASSETS_SO_TYPE]: { rule_id: ruleId, version },
                  },
                },
              ],
            },
          },
        },
      ],
    },
  },
});

const libraryAggResponse = (...buckets: Array<{ key: string[]; version: number | null }>) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
  aggregations: {
    rules: {
      buckets: buckets.map(({ key, version }) => ({ key, latest_version: { value: version } })),
    },
  },
});

const hitsResponse = (ruleId: string, version: number) => ({
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: {
    total: { value: 1, relation: 'eq' },
    max_score: null,
    hits: [
      {
        _source: {
          [PREBUILT_RULE_ASSETS_SO_TYPE]: { rule_id: ruleId, version, type: 'query' },
        },
      },
    ],
  },
});

const emptyHitsResponse = {
  took: 1,
  timed_out: false,
  _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
  hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
};

describe('fetchLatestVersions', () => {
  let searchMock: jest.Mock;
  let savedObjectsClient: SavedObjectsClientContract;

  beforeEach(() => {
    searchMock = jest.fn();
    savedObjectsClient = {
      search: searchMock,
      find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0, per_page: 0, page: 1 }),
      getCurrentNamespace: () => 'default',
    } as unknown as SavedObjectsClientContract;
  });

  describe('tag filtering', () => {
    const RULE_ID = 'aws-s3-bucket-public';
    const OLD_TAG = 'Data Source: AWS';

    beforeEach(() => {
      searchMock
        .mockResolvedValueOnce(aggResponse(RULE_ID, 10))
        .mockResolvedValueOnce(emptyHitsResponse);
    });

    it('excludes a rule when its latest version no longer has the filtered tag', async () => {
      const result = await fetchLatestVersions(savedObjectsClient, {
        filter: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags: "${OLD_TAG}"`,
      });

      expect(result).toEqual([]);
    });

    it('applies the tag filter only to the asset fetch, not the latest-version aggregation', async () => {
      const kqlFilter = `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags: "${OLD_TAG}"`;
      const [expectedFilterClause] = prepareQueryDslFilter({ filter: kqlFilter }).filter;

      await fetchLatestVersions(savedObjectsClient, { filter: kqlFilter });

      const [aggCall, assetFetchCall] = searchMock.mock.calls;

      expect(aggCall[0].query.bool.filter).not.toContainEqual(expectedFilterClause);
      expect(assetFetchCall[0].query.bool.filter).toContainEqual(expectedFilterClause);
    });
  });

  it('returns the latest version when its tags match the filter', async () => {
    const RULE_ID = 'aws-s3-bucket-public';

    searchMock
      .mockResolvedValueOnce(aggResponse(RULE_ID, 10))
      .mockResolvedValueOnce(hitsResponse(RULE_ID, 10));

    const result = await fetchLatestVersions(savedObjectsClient, {
      filter: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags: "Platform: AWS"`,
    });

    expect(result).toEqual([{ rule_id: RULE_ID, version: 10, type: 'query' }]);
  });

  it('returns all latest versions when no filter is provided', async () => {
    searchMock
      .mockResolvedValueOnce(aggResponse('rule-1', 5))
      .mockResolvedValueOnce(hitsResponse('rule-1', 5));

    const result = await fetchLatestVersions(savedObjectsClient);

    expect(result).toEqual([{ rule_id: 'rule-1', version: 5, type: 'query' }]);
  });

  describe('for libraries', () => {
    it('asks for the highest version of each rule and reads only those documents', async () => {
      searchMock
        .mockResolvedValueOnce(libraryAggResponse({ key: ['rule-1', 'lib-1'], version: 7 }))
        .mockResolvedValueOnce(hitsResponse('rule-1', 7));

      const result = await fetchLatestVersions(savedObjectsClient, { libraryIds: ['lib-1'] });

      const [aggregationQuery, documentsQuery] = searchMock.mock.calls.map(([query]) => query);
      expect(aggregationQuery.aggs.rules.aggs).toEqual({
        latest_version: { max: { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.version` } },
      });
      expect(documentsQuery.query.bool.filter).toContainEqual({
        terms: { _id: [`${PREBUILT_RULE_ASSETS_SO_TYPE}:lib-1_rule-1_7`] },
      });
      expect(result).toEqual([{ rule_id: 'rule-1', version: 7, type: 'query' }]);
    });

    it('keeps the same rule apart in two libraries', async () => {
      searchMock
        .mockResolvedValueOnce(
          libraryAggResponse(
            { key: ['rule-1', 'lib-1'], version: 7 },
            { key: ['rule-1', 'lib-2'], version: 3 }
          )
        )
        .mockResolvedValueOnce(emptyHitsResponse);

      await fetchLatestVersions(savedObjectsClient, { libraryIds: ['lib-1', 'lib-2'] });

      expect(searchMock.mock.calls[1][0].query.bool.filter).toContainEqual({
        terms: {
          _id: [
            `${PREBUILT_RULE_ASSETS_SO_TYPE}:lib-1_rule-1_7`,
            `${PREBUILT_RULE_ASSETS_SO_TYPE}:lib-2_rule-1_3`,
          ],
        },
      });
    });

    it('skips a rule that has no version', async () => {
      searchMock
        .mockResolvedValueOnce(libraryAggResponse({ key: ['rule-1', 'lib-1'], version: null }))
        .mockResolvedValueOnce(emptyHitsResponse);

      await fetchLatestVersions(savedObjectsClient, { libraryIds: ['lib-1'] });

      expect(searchMock.mock.calls[1][0].query.bool.filter).toContainEqual({ terms: { _id: [] } });
    });
  });
});
