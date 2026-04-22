/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type {
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import { invariant } from '../../../../../../../../common/utils/invariant';
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { validatePrebuiltRuleAssets } from '../../prebuilt_rule_assets_validation';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { getPrebuiltRuleAssetSoId, getPrebuiltRuleAssetsSearchNamespace } from '../utils';

export interface FetchAssetsByVersionSearchParams {
  filter?: string;
  aggs?: Record<string, AggregationsAggregationContainer>;
  sort?: Sort;
  trackTotalHits?: boolean;
  page?: number;
  perPage?: number;
  fields?: string[];
}

export interface FetchAssetsByVersionResult {
  assets: PrebuiltRuleAsset[];
  total?: number;
  aggregations?: Record<string, AggregationsAggregationContainer>;
}

/**
 * Fetches prebuilt rule assets for specified rule versions.
 *
 * Takes a list of objects with "rule_id" and "version" properties.
 * Returns full prebuilt rule.
 *
 * @param savedObjectsClient - The saved objects client used to query the saved objects store
 * @param versions - An array of rule version specifiers, each containing a rule_id and version.
 * @param params - Optional search options (e.g. `aggs`, `sort`, `_source`) merged into the underlying SO search.
 * @returns A promise that resolves to an array of prebuilt rule assets.
 */
export async function fetchAssetsByVersion(
  savedObjectsClient: SavedObjectsClientContract,
  versions: RuleVersionSpecifier[],
  params?: FetchAssetsByVersionSearchParams
): Promise<FetchAssetsByVersionResult> {
  if (versions.length === 0) {
    // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
    return {
      assets: [],
      total: 0,
    };
  }

  const soIds = versions.map((version) =>
    getPrebuiltRuleAssetSoId(version.rule_id, version.version)
  );

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource & {
      [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    query: buildQuery(soIds, params?.filter),
    fields: ['enabled'],
    track_total_hits: params?.trackTotalHits,
    size: params?.perPage,
    from: params?.page && params.perPage ? (params.page - 1) * params.perPage : undefined,
    sort: params?.sort,
    aggs: params?.aggs,
  });

  const ruleAssets = searchResult.hits.hits.map((hit) => {
    const hitSource = hit?._source;
    invariant(hitSource, 'Expected hit source to be defined');

    const savedObject = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
    return savedObject;
  });

  return {
    assets: validatePrebuiltRuleAssets(ruleAssets),
    total:
      typeof searchResult.hits.total === 'number'
        ? searchResult.hits.total
        : searchResult.hits.total?.value,
    aggregations: searchResult.aggregations as Record<string, AggregationsAggregationContainer>,
  };
}

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
