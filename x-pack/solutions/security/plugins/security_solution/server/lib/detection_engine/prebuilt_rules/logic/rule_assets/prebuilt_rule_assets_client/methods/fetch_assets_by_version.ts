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
import {
  PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
  getPrebuiltRuleAssetSoId,
  getPrebuiltRuleAssetsSearchNamespace,
} from '../utils';
import { buildPrebuiltRuleAssetSourceIncludes } from '../build_source_includes';

/**
 * Default upper bound applied to `size` when callers don't provide an explicit
 * `perPage`
 */
export const PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP = 100;

export interface FetchAssetsByVersionSearchParams {
  filter?: string;
  aggs?: Record<string, AggregationsAggregationContainer>;
  sort?: Sort;
  page?: number;
  perPage?: number;
  fields?: string[];
  /**
   * When provided, narrows the returned hits to these rule versions via
   * `post_filter`, while leaving aggregations scoped to the full set defined
   * by `versions`.
   */
  hitsFilterVersions?: RuleVersionSpecifier[];
}

export interface FetchAssetsByVersionResult {
  assets: PrebuiltRuleAsset[];
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
 * @returns A promise that resolves to assets (and optional aggregations when requested).
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

  // `query` defines the scope aggregations run over (the full installable set
  // when `hitsFilterVersions` is provided). `post_filter` narrows returned
  // hits to the caller's page without affecting aggregation buckets.
  const postFilterSoIds = params?.hitsFilterVersions?.map((version) =>
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
    ...(postFilterSoIds ? { post_filter: { terms: { _id: postFilterSoIds } } } : {}),
    ...(sourceIncludes ? { _source: { includes: sourceIncludes } } : {}),
    runtime_mappings: PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
    size: params?.perPage ?? Math.min(versions.length, PREBUILT_RULE_ASSETS_FETCH_BATCH_CAP),
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

  const orderedRuleAssets: PrebuiltRuleAsset[] = [];

  for (const id of soIds) {
    const asset = ruleAssetsMap.get(id);
    if (asset !== undefined) {
      orderedRuleAssets.push(asset);
    }
  }

  return {
    assets: validatePrebuiltRuleAssets(orderedRuleAssets),
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
