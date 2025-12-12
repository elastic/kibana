/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTermsAggregateBase,
  AggregationsTopHitsAggregate,
  SearchHitsMetadata,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAssets } from './prebuilt_rule_assets_validation';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from './prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../rule_versions/rule_version_specifier';
import type { BasicRuleInfo } from '../basic_rule_info';
import type { ReviewPrebuiltRuleInstallationFilter } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_installation_filter';
import type { ReviewPrebuiltRuleInstallationSort } from '../../../../../../common/api/detection_engine/prebuilt_rules/common/review_prebuilt_rules_installation_sort';

const MAX_PREBUILT_RULES_COUNT = 10_000;

export interface IPrebuiltRuleAssetsClient {
  fetchLatestAssets: () => Promise<PrebuiltRuleAsset[]>;

  fetchLatestVersions: (args?: {
    ruleIds?: string[];
    sort?: ReviewPrebuiltRuleInstallationSort;
    filter?: ReviewPrebuiltRuleInstallationFilter;
  }) => Promise<BasicRuleInfo[]>;

  fetchAssetsByVersion(versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]>;

  fetchTagsByVersion(versions: RuleVersionSpecifier[]): Promise<string[]>;
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

    fetchLatestVersions: ({ ruleIds, sort, filter } = {}): Promise<BasicRuleInfo[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestVersions', async () => {
        if (ruleIds && ruleIds.length === 0) {
          return [];
        }

        const queryFilter = [];

        if (ruleIds) {
          queryFilter.push({
            terms: {
              [`${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`]: ruleIds,
            },
          });
        }

        if (filter?.fields?.name?.include) {
          filter.fields.name.include.forEach((name) => {
            queryFilter.push({
              wildcard: {
                [`${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`]: `*${name}*`,
              },
            });
          });
        }

        if (filter?.fields.tags?.include) {
          filter.fields.tags.include.forEach((tag) => {
            queryFilter.push({
              term: {
                [`${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`]: tag,
              },
            });
          });
        }

        const latestVersionSpecifiersResult = await savedObjectsClient.search<
          SavedObjectsRawDocSource,
          {
            rules: AggregationsMultiBucketAggregateBase<{
              latest_version: {
                hits: SearchHitsMetadata<{
                  [PREBUILT_RULE_ASSETS_SO_TYPE]: RuleVersionSpecifier;
                }>;
              };
            }>;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          namespaces: ['default'],
          _source: false,
          size: 0,
          query: {
            bool: {
              filter: queryFilter,
            },
          },
          aggs: {
            rules: {
              terms: {
                field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
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
                    ],
                  },
                },
              },
            },
          },
        });

        const buckets = latestVersionSpecifiersResult.aggregations?.rules?.buckets;

        invariant(Array.isArray(buckets), 'Expected buckets to be an array');

        const latestVersionSpecifiers: RuleVersionSpecifier[] = buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          const hitSource = hit?._source;

          invariant(hitSource, 'Expected hit source to be defined');

          const soAttributes = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
          return {
            rule_id: soAttributes.rule_id,
            version: soAttributes.version,
          };
        });

        const soIds = latestVersionSpecifiers.map(
          (rule) => `${PREBUILT_RULE_ASSETS_SO_TYPE}:${rule.rule_id}_${rule.version}`
        );

        const savedObjectSortParameter = transformSortParameter(sort);

        const searchResult = await savedObjectsClient.search<
          SavedObjectsRawDocSource & {
            [PREBUILT_RULE_ASSETS_SO_TYPE]: BasicRuleInfo;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          namespaces: ['default'],
          size: MAX_PREBUILT_RULES_COUNT,
          runtime_mappings: {
            [`${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`]: {
              type: 'long',
              script: {
                source: `emit(params.rank.getOrDefault(doc['${PREBUILT_RULE_ASSETS_SO_TYPE}.severity'].value, 0))`,
                params: { rank: { low: 20, medium: 40, high: 60, critical: 80 } },
              },
            },
          },
          query: {
            terms: {
              _id: soIds,
            },
          },
          sort: savedObjectSortParameter?.map((s) => {
            return { [s.field]: s.order };
          }),
          _source: [
            `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
            `${PREBUILT_RULE_ASSETS_SO_TYPE}.version`,
            `${PREBUILT_RULE_ASSETS_SO_TYPE}.type`,
          ],
        });

        const latestVersions = searchResult.hits.hits.map((hit) => {
          const hitSource = hit?._source;
          invariant(hitSource, 'Expected hit source to be defined');

          const soAttributes = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
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

        const soIds = versions.map(
          (version) => `${PREBUILT_RULE_ASSETS_SO_TYPE}:${version.rule_id}_${version.version}`
        );

        const searchResult = await savedObjectsClient.search<
          SavedObjectsRawDocSource & {
            [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          namespaces: ['default'],
          size: MAX_PREBUILT_RULES_COUNT,
          query: {
            terms: {
              _id: soIds,
            },
          },
        });

        const ruleAssets = searchResult.hits.hits.map((hit) => {
          const hitSource = hit?._source;
          invariant(hitSource, 'Expected hit source to be defined');

          const savedObject = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
          return savedObject;
        });

        const ruleAssetsMap = new Map<string, PrebuiltRuleAsset>();
        for (const asset of ruleAssets) {
          const key = `${PREBUILT_RULE_ASSETS_SO_TYPE}:${asset.rule_id}_${asset.version}`;
          ruleAssetsMap.set(key, asset);
        }

        // Preserve the input order by mapping over the input versions array
        const orderedRuleAssets = soIds
          .map((soId) => ruleAssetsMap.get(soId))
          .filter((asset) => asset !== undefined);

        return validatePrebuiltRuleAssets(orderedRuleAssets);
      });
    },

    fetchTagsByVersion: (versions: RuleVersionSpecifier[]): Promise<string[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchTagsByVersion', async () => {
        const soIds = versions.map(
          (version) => `${PREBUILT_RULE_ASSETS_SO_TYPE}:${version.rule_id}_${version.version}`
        );

        const searchResult = await savedObjectsClient.search<
          SavedObjectsRawDocSource,
          { unique_tags: AggregationsTermsAggregateBase<{ key: string; doc_count: number }> }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          namespaces: ['default'],
          _source: false,
          size: 0,
          query: {
            terms: {
              _id: soIds,
            },
          },
          aggs: {
            unique_tags: {
              terms: {
                field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`,
                size: 10000,
                order: { _key: 'asc' },
              },
            },
          },
        });

        const buckets = searchResult.aggregations?.unique_tags?.buckets || [];
        invariant(Array.isArray(buckets), 'Expected buckets to be an array');

        const tags = buckets.map((bucket) => bucket.key);
        return tags;
      });
    },
  };
};

function transformSortParameter(
  sort?: { field: 'name' | 'severity' | 'risk_score'; order: 'asc' | 'desc' }[]
) {
  const soSortFields = {
    name: `${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`,
    severity: `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`,
    risk_score: `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score`,
  };
  return sort?.map((s) => {
    return { field: soSortFields[s.field], order: s.order };
  });
}
