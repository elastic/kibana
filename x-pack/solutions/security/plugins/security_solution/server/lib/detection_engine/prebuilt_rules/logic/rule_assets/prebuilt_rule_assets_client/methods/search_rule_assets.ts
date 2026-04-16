/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  Sort,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { invariant } from '../../../../../../../../common/utils/invariant';
import type { SortOrder } from '../../../../../../../../common/api/detection_engine';
import type { PrebuiltRuleAssetsSortField } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { getPrebuiltRuleAssetSoId, getPrebuiltRuleAssetsSearchNamespace } from '../utils';

export interface SearchRuleAssetsParams {
  /**
   * The latest-version specifiers for the eligible rule set (e.g. installable
   * rules). The search will be restricted to exactly these asset SOs.
   */
  versions: RuleVersionSpecifier[];
  /**
   * KQL filter string using native `security-rule.attributes.*` field names.
   */
  filter?: string;
  sortField?: PrebuiltRuleAssetsSortField;
  sortOrder?: SortOrder;
  /**
   * Page number (1-based). Ignored when `searchAfter` is provided.
   */
  page?: number;
  perPage: number;
  searchAfter?: SortResults;
  aggregations?: Record<string, AggregationsAggregationContainer>;
}

export interface SearchRuleAssetsResult {
  assets: PrebuiltRuleAsset[];
  total: number;
  searchAfter?: SortResults;
  aggregations?: Record<string, unknown>;
}

const SO_SORT_FIELDS: Record<PrebuiltRuleAssetsSortField, string> = {
  name: `${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`,
  severity: `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`,
  risk_score: `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score`,
};

const buildSort = (
  sortField: PrebuiltRuleAssetsSortField | undefined,
  sortOrder: SortOrder | undefined
): Sort | undefined => {
  if (sortField == null || sortOrder == null) {
    return undefined;
  }
  return [{ [SO_SORT_FIELDS[sortField]]: sortOrder }];
};

const buildQuery = (soIds: string[], filter: string | undefined): QueryDslQueryContainer => {
  const must: QueryDslQueryContainer[] = [
    {
      terms: {
        _id: soIds,
      },
    },
  ];

  if (filter && filter.trim() !== '') {
    try {
      const kqlDsl = toElasticsearchQuery(fromKueryExpression(filter));
      must.push(kqlDsl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid KQL filter: ${message}`);
    }
  }

  return {
    bool: {
      must,
      must_not: {
        term: { [`${PREBUILT_RULE_ASSETS_SO_TYPE}.deprecated`]: true },
      },
    },
  };
};

/**
 * Searches prebuilt rule assets restricted to a known set of rule versions
 * (latest-version specifiers), applying a KQL filter, sort, pagination (or
 * search_after), and aggregations.
 */
export async function searchRuleAssets(
  savedObjectsClient: SavedObjectsClientContract,
  {
    versions,
    filter,
    sortField,
    sortOrder,
    page = 1,
    perPage,
    searchAfter,
    aggregations,
  }: SearchRuleAssetsParams
): Promise<SearchRuleAssetsResult> {
  if (versions.length === 0) {
    return { assets: [], total: 0 };
  }

  const soIds = versions.map((version) =>
    getPrebuiltRuleAssetSoId(version.rule_id, version.version)
  );

  const sort = buildSort(sortField, sortOrder);
  const shouldUseSearchAfter = searchAfter != null && sort != null;
  const from = shouldUseSearchAfter ? undefined : (page - 1) * perPage;

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource & {
      [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset;
    },
    Record<string, unknown>
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    size: perPage,
    from,
    search_after: shouldUseSearchAfter ? searchAfter : undefined,
    track_total_hits: true,
    runtime_mappings: {
      [`${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`]: {
        type: 'long',
        script: {
          source: `emit(params.rank.getOrDefault(doc['${PREBUILT_RULE_ASSETS_SO_TYPE}.severity'].value, 0))`,
          params: { rank: { low: 20, medium: 40, high: 60, critical: 80 } },
        },
      },
    },
    query: buildQuery(soIds, filter),
    sort,
    aggs: aggregations,
  });

  const assets = searchResult.hits.hits.map((hit) => {
    const hitSource = hit?._source;
    invariant(hitSource, 'Expected hit source to be defined');
    return hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
  });

  const totalHits = searchResult.hits.total;
  const total =
    typeof totalHits === 'number'
      ? totalHits
      : typeof totalHits === 'object' && totalHits != null
      ? totalHits.value
      : assets.length;

  const lastHit = searchResult.hits.hits[searchResult.hits.hits.length - 1];
  const nextSearchAfter =
    sort != null && lastHit?.sort != null ? (lastHit.sort as SortResults) : undefined;

  return {
    assets,
    total,
    searchAfter: nextSearchAfter,
    aggregations: searchResult.aggregations,
  };
}
