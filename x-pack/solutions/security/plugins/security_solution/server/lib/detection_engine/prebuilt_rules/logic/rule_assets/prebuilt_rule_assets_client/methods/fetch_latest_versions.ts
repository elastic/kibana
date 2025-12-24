/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsMultiBucketAggregateBase,
  SearchHitsMetadata,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import type { BasicRuleInfo } from '../../../basic_rule_info';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { PrebuiltRuleAssetsFilter } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';

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

export async function fetchLatestVersions(
  savedObjectsClient: SavedObjectsClientContract,
  args?: {
    ruleIds?: string[];
    sort?: PrebuiltRuleAssetsSort;
    filter?: PrebuiltRuleAssetsFilter;
  }
): Promise<BasicRuleInfo[]> {
  const { ruleIds, sort, filter } = args || {};

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
}
