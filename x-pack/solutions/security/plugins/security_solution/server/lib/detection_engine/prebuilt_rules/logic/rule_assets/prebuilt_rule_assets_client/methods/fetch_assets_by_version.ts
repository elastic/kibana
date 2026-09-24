/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type {
  AggregationsAggregate,
  AggregationsAggregationContainer,
  QueryDslQueryContainer,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import { invariant } from '../../../../../../../../common/utils/invariant';
import type { PrebuiltRuleAsset } from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { validatePrebuiltRuleAssets } from '../../prebuilt_rule_assets_validation';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import {
  PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
  getPrebuiltRuleAssetSoId,
  getPrebuiltRuleAssetsSearchNamespace,
} from '../utils';
import { buildPrebuiltRuleAssetSourceIncludes } from '../build_source_includes';
export interface FetchAssetsByVersionSearchParams {
  filter?: string;
  aggs?: Record<string, AggregationsAggregationContainer>;
  sort?: Sort;
  page?: number;
  perPage?: number;
  fields?: string[];
}

export interface FetchAssetsByVersionResult {
  assets: PrebuiltRuleAsset[];
  aggregations?: Record<string, AggregationsAggregate>;
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
    };
  }

  const soIds = versions.map((version) =>
    getPrebuiltRuleAssetSoId(version.rule_id, version.version)
  );

  const sourceIncludes = buildPrebuiltRuleAssetSourceIncludes(params?.fields);

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource & {
      [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    query: buildQuery(soIds, params?.filter),
    ...(sourceIncludes ? { _source: { includes: sourceIncludes } } : {}),
    runtime_mappings: PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
    size: params?.perPage ?? MAX_PREBUILT_RULES_COUNT,
    from:
      params?.page != null && params?.perPage != null
        ? (params.page - 1) * params.perPage
        : undefined,
    sort: params?.sort,
    aggs: params?.aggs,
  });

  const ruleAssetsMap = new Map<string, PrebuiltRuleAsset>();

  for (const hit of searchResult.hits.hits) {
    const hitSource = hit?._source;
    invariant(hitSource, 'Expected hit source to be defined');

    const asset = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
    ruleAssetsMap.set(getPrebuiltRuleAssetSoId(asset.rule_id, asset.version), asset);
  }

  // When the caller specifies `sort`, ES already returned hits in the requested
  // order and `Map` preserves insertion order, so emitting the map's values
  // honors that sort. Otherwise (no sort) we restore the caller's `versions`
  // order so unsorted callers get a deterministic shape that matches their
  // input.
  const orderedRuleAssets: PrebuiltRuleAsset[] = params?.sort
    ? Array.from(ruleAssetsMap.values())
    : soIds.flatMap((id) => {
        const asset = ruleAssetsMap.get(id);
        return asset !== undefined ? [asset] : [];
      });

  return {
    assets: validatePrebuiltRuleAssets(orderedRuleAssets),
    aggregations: searchResult.aggregations as Record<string, AggregationsAggregate>,
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
