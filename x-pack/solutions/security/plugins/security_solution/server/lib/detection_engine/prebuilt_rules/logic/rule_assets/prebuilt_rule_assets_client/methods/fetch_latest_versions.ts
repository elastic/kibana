/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsMultiBucketAggregateBase,
  AggregationsTopHitsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import type { BasicRuleInfo } from '../../../basic_rule_info';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { PrebuiltRuleAssetsFilter } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import { createChunkedFilters, chunkedFetch } from '../utils';

type RuleVersionInfo = BasicRuleInfo & {
  name: string;
  tags: string[];
  risk_score: number;
  severity: string;
};
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';

const SEVERITY_RANK: Record<string, number> = {
  low: 20,
  medium: 40,
  high: 60,
  critical: 80,
};

/**
 * Fetches the BasicRuleInfo for prebuilt rule assets: rule_id, version and type.
 * By default, fetches BasicRuleInfo for all prebuilt rule assets.
 * If ruleIds are provided, only fetches for the provided ruleIds.
 *
 * @param savedObjectsClient - Saved Objects client
 * @param queryParameters - Optional arguments object
 * @param queryParameters.ruleIds - Optional array of rule IDs to query for
 * @param queryParameters.filter - Optional filter configuration
 * @param queryParameters.sort - Optional sort configuration
 * @returns A promise that resolves to an array of BasicRuleInfo objects (rule_id, version, type).
 */
export async function fetchLatestVersions(
  savedObjectsClient: SavedObjectsClientContract,
  queryParameters?: {
    ruleIds?: string[];
    filter?: PrebuiltRuleAssetsFilter;
    sort?: PrebuiltRuleAssetsSort;
  }
): Promise<BasicRuleInfo[]> {
  const { ruleIds, filter, sort } = queryParameters ?? {};

  if (ruleIds && ruleIds.length === 0) {
    return [];
  }

  const fetchLatestVersionInfo = async (kqlFilter?: string) => {
    const findResult = await savedObjectsClient.find<
      PrebuiltRuleAsset,
      {
        rules: AggregationsMultiBucketAggregateBase<{
          latest_version: AggregationsTopHitsAggregate;
        }>;
      }
    >({
      type: PREBUILT_RULE_ASSETS_SO_TYPE,
      filter: kqlFilter,
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
                  `${PREBUILT_RULE_ASSETS_SO_TYPE}.name`,
                  `${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`,
                  `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score`,
                  `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity`,
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

  const filters = queryParameters?.ruleIds
    ? createChunkedFilters({
        items: queryParameters.ruleIds,
        mapperFn: (ruleId) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id: ${ruleId}`,
        clausesPerItem: 2,
      })
    : undefined;

  const buckets = await chunkedFetch(fetchLatestVersionInfo, filters);

  const latestVersions = buckets.map((bucket) => {
    const hit = bucket.latest_version.hits.hits[0];
    const soAttributes = hit._source[PREBUILT_RULE_ASSETS_SO_TYPE];
    return {
      rule_id: soAttributes.rule_id,
      version: soAttributes.version,
      type: soAttributes.type,
      name: soAttributes.name,
      tags: soAttributes.tags,
      risk_score: soAttributes.risk_score,
      severity: soAttributes.severity,
    };
  });

  const filteredVersions = filterRuleVersions(latestVersions, filter);

  return sortRuleVersions(filteredVersions, sort);
}

const filterRuleVersions = (
  versions: RuleVersionInfo[],
  filter?: PrebuiltRuleAssetsFilter
): RuleVersionInfo[] => {
  if (!filter?.fields) return versions;

  return versions.filter((versionInfo) => {
    // Name filter (case-insensitive substring match for all provided terms)
    const nameValues = filter.fields.name?.include?.values;
    if (nameValues?.length) {
      const nameLower = versionInfo.name.toLowerCase();
      const matchesAllNames = nameValues.every((val) => nameLower.includes(val.toLowerCase()));
      if (!matchesAllNames) return false;
    }

    // Tags filter (exact match for all provided tags)
    const tagValues = filter.fields.tags?.include?.values;
    if (tagValues?.length) {
      const matchesAllTags = tagValues.every((tag) => versionInfo.tags.includes(tag));
      if (!matchesAllTags) return false;
    }

    return true;
  });
};

const sortRuleVersions = (
  versions: RuleVersionInfo[],
  sort?: PrebuiltRuleAssetsSort
): RuleVersionInfo[] => {
  const sortField = sort?.[0]?.field;
  if (!sortField) {
    return versions;
  }

  const order = sort?.[0]?.order ?? 'asc';
  const direction = order === 'desc' ? -1 : 1;

  return versions.sort((a, b) => {
    switch (sortField) {
      case 'name':
        return a.name.localeCompare(b.name) * direction;
      case 'risk_score':
        return (a.risk_score - b.risk_score) * direction;
      case 'severity': {
        const rankA = SEVERITY_RANK[a.severity] ?? -1;
        const rankB = SEVERITY_RANK[b.severity] ?? -1;
        return (rankA - rankB) * direction;
      }
      default:
        return 0;
    }
  });
};
