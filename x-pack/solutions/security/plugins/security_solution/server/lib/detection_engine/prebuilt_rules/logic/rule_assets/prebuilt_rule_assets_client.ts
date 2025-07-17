/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk, uniqBy } from 'lodash';
import pMap from 'p-map';
import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { invariant } from '../../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAssets } from './prebuilt_rule_assets_validation';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from './prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../rule_versions/rule_version_specifier';
import type { BasicRuleInfo } from '../basic_rule_info';

const RULE_ASSET_ATTRIBUTES = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes`;
const MAX_PREBUILT_RULES_COUNT = 10_000;
const ES_MAX_CLAUSE_COUNT = 1024;
const ES_MAX_CONCURRENT_REQUESTS = 2;

export interface IPrebuiltRuleAssetsClient {
  fetchLatestAssets: () => Promise<PrebuiltRuleAsset[]>;

  fetchLatestVersions(ruleIds?: string[]): Promise<BasicRuleInfo[]>;

  fetchAssetsByVersion(versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]>;
}

export const createPrebuiltRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): IPrebuiltRuleAssetsClient => {
  return {
    fetchLatestAssets: () => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestAssets', async () => {
        const findResult = await savedObjectsClient.find<
          PrebuiltRuleAsset,
          {
            rules: AggregationsMultiBucketAggregateBase<{
              latest_version: AggregationsTopHitsAggregate;
            }>;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          aggs: {
            rules: {
              terms: {
                field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id`,
                size: MAX_PREBUILT_RULES_COUNT,
              },
              aggs: {
                latest_version: {
                  top_hits: {
                    size: 1,
                    sort: {
                      [`${PREBUILT_RULE_ASSETS_SO_TYPE}.version`]: 'desc',
                    },
                  },
                },
              },
            },
          },
        });

        const buckets = findResult.aggregations?.rules?.buckets ?? [];
        invariant(Array.isArray(buckets), 'Expected buckets to be an array');

        const ruleAssets = buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          return hit._source[PREBUILT_RULE_ASSETS_SO_TYPE];
        });

        return validatePrebuiltRuleAssets(ruleAssets);
      });
    },

    fetchLatestVersions: (ruleIds?: string[]): Promise<BasicRuleInfo[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestVersions', async () => {
        if (ruleIds && ruleIds.length === 0) {
          return [];
        }

        const fetchLatestVersionInfo = async (filter?: string) => {
          const findResult = await savedObjectsClient.find<
            PrebuiltRuleAsset,
            {
              rules: AggregationsMultiBucketAggregateBase<{
                latest_version: AggregationsTopHitsAggregate;
              }>;
            }
          >({
            type: PREBUILT_RULE_ASSETS_SO_TYPE,
            filter,
            aggs: {
              rules: {
                terms: {
                  field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id`,
                  size: MAX_PREBUILT_RULES_COUNT,
                },
                aggs: {
                  latest_version: {
                    top_hits: {
                      size: 1,
                      sort: [
                        {
                          [`${PREBUILT_RULE_ASSETS_SO_TYPE}.version`]: 'desc',
                        },
                      ],
                      _source: [
                        `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
                        `${PREBUILT_RULE_ASSETS_SO_TYPE}.version`,
                        `${PREBUILT_RULE_ASSETS_SO_TYPE}.type`,
                      ],
                    },
                  },
                },
              },
            },
          });

          const aggregatedBuckets = findResult.aggregations?.rules?.buckets ?? [];
          invariant(Array.isArray(aggregatedBuckets), 'Expected buckets to be an array');

          return aggregatedBuckets;
        };

        const filters = ruleIds
          ? createChunkedFilters({
              items: ruleIds,
              mapperFn: (ruleId) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id: ${ruleId}`,
              clausesPerItem: 2,
            })
          : undefined;

        const buckets = await chunkedFetch(fetchLatestVersionInfo, filters);

        const latestVersions = buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          const soAttributes = hit._source[PREBUILT_RULE_ASSETS_SO_TYPE];
          const versionInfo: BasicRuleInfo = {
            rule_id: soAttributes.rule_id,
            version: soAttributes.version,
            type: soAttributes.type,
          };
          return versionInfo;
        });

        return latestVersions;
      });
    },

    fetchAssetsByVersion: (versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchAssetsByVersion', async () => {
        if (versions.length === 0) {
          // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
          return [];
        }

        const filters = createChunkedFilters({
          items: versions,
          mapperFn: (versionSpecifier) =>
            `(${RULE_ASSET_ATTRIBUTES}.rule_id: ${versionSpecifier.rule_id} AND ${RULE_ASSET_ATTRIBUTES}.version: ${versionSpecifier.version})`,
          clausesPerItem: 4,
        });

        const ruleAssets = await chunkedFetch(async (filter) => {
          // Usage of savedObjectsClient.bulkGet() is ~25% more performant and
          // simplifies deduplication but too many tests get broken.
          // See https://github.com/elastic/kibana/issues/218198
          const findResult = await savedObjectsClient.find<PrebuiltRuleAsset>({
            type: PREBUILT_RULE_ASSETS_SO_TYPE,
            filter,
            perPage: MAX_PREBUILT_RULES_COUNT,
          });

          return findResult.saved_objects.map((so) => so.attributes);
        }, filters);

        // Rule assets may have duplicates we have to get rid of.
        // In particular prebuilt rule assets package v8.17.1 has duplicates.
        const uniqueRuleAssets = uniqBy(ruleAssets, 'rule_id');

        return validatePrebuiltRuleAssets(uniqueRuleAssets);
      });
    },
  };
};

/**
 * Creates an array of KQL filter strings for a collection of items.
 * Uses chunking to ensure that the number of filter clauses does not exceed the ES "too_many_clauses" limit.
 * See: https://github.com/elastic/kibana/pull/223240
 *
 * @param {object} options
 * @param {T[]} options.items - Array of items to create filters for.
 * @param {(item: T) => string} options.mapperFn - A function that maps an item to a filter string.
 * @param {number} options.clausesPerItem - Number of Elasticsearch clauses generated per item. Determined empirically by converting a KQL filter into a Query DSL query.
 * More complex filters will result in more clauses. Info about clauses in docs: https://www.elastic.co/docs/explore-analyze/query-filter/languages/querydsl#query-dsl
 * @returns {string[]} An array of filter strings
 */
function createChunkedFilters<T>({
  items,
  mapperFn,
  clausesPerItem,
}: {
  items: T[];
  mapperFn: (item: T) => string;
  clausesPerItem: number;
}): string[] {
  return chunk(items, ES_MAX_CLAUSE_COUNT / clausesPerItem).map((singleChunk) =>
    singleChunk.map(mapperFn).join(' OR ')
  );
}

/**
 * Fetches objects using a provided function.
 * If filters are provided fetches concurrently in chunks.
 *
 * @param {(filter?: string) => Promise<T[]>} chunkFetchFn - Function that fetches a chunk.
 * @param {string[]} [filters] - An optional array of filter strings. If provided, `chunkFetchFn` will be called for each filter concurrently.
 * @returns {Promise<T[]>} A promise that resolves to an array of fetched objects.
 */
function chunkedFetch<T>(
  chunkFetchFn: (filter?: string) => Promise<T[]>,
  filters?: string[]
): Promise<T[]> {
  if (filters?.length) {
    return pMap(filters, chunkFetchFn, {
      concurrency: ES_MAX_CONCURRENT_REQUESTS,
    }).then((results) => results.flat());
  }

  return chunkFetchFn();
}
