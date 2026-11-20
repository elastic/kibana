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
import type { ESFilter } from '@kbn/es-types';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { invariant } from '../../../../../../../../common/utils/invariant';
import { MAX_PREBUILT_RULES_COUNT } from '../../../../../rule_management/logic/search/get_existing_prepackaged_rules';
import type { BasicRuleInfo } from '../../../basic_rule_info';
import type { RuleVersionSpecifier } from '../../../rule_versions/rule_version_specifier';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import {
  PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
  prepareQueryDslFilter,
  prepareQueryDslSort,
  getPrebuiltRuleAssetSoId,
  getPrebuiltRuleAssetsSearchNamespace,
} from '../utils';
import { fetchDeprecatedRules } from './fetch_deprecated_rules';

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
    sort?: PrebuiltRuleAssetsSort;
    filter?: string;
    libraryIds?: string[];
  }
): Promise<BasicRuleInfo[]> {
  const { ruleIds, sort, filter, libraryIds } = queryParameters || {};

  if (ruleIds && ruleIds.length === 0) {
    return [];
  }

  // First, fetch the latest version numbers for each rule_id.
  const latestVersionSpecifiers: RuleVersionSpecifier[] = await fetchLatestVersionSpecifiers(
    savedObjectsClient,
    ruleIds,
    libraryIds
  );

  const soIds = latestVersionSpecifiers.map((rule) =>
    getPrebuiltRuleAssetSoId(rule.rule_id, rule.version, rule.library_id)
  );
  const latestVersions = await fetchVersionsBySoIds(savedObjectsClient, soIds, sort, filter);

  return latestVersions;
}

async function fetchLatestVersionSpecifiers(
  savedObjectsClient: SavedObjectsClientContract,
  ruleIds?: string[],
  libraryIds?: string[]
) {
  /**
   * Fetches deprecated rule assets in order to filter out all versions of the deprecated rules
   * in the latest version query. Since we fetch the most recent version of the asset, if we filter
   * out assets using the `type` field, the query would still return the deprecated asset, just one
   * version older. This filter ensures all rule assets fetched will not contain any rule ids that
   * have been labeled as deprecated.
   */
  const deprecatedRuleAssets = await fetchDeprecatedRules(savedObjectsClient, ruleIds, libraryIds);
  const deprecatedRuleIds = deprecatedRuleAssets.map((asset) => asset.rule_id);

  // TODO: Browsing a library is slow, and stops at 10,000 rules, because "which version of each rule
  // is the latest?" is worked out at read time, on every request.
  //
  // The problem: a library keeps every version of every rule, one saved object each. To list the rules
  // of a library, all of them are grouped by (rule_id, library_id) to find the highest version. That
  // runs on every page change, sort, search and filter, and is followed by fetching up to
  // MAX_PREBUILT_RULES_COUNT documents so they can be sorted and filtered before one page is returned.
  // This was written for the Elastic library (about 2.4k rules). A library with 40k rules is 15 times
  // bigger, and the work grows with it. Measured on a 1 GB node with about 55k rule assets:
  // grouping with top_hits took about 9s, grouping with max(version), as below, about 0.4s, and
  // fetching the 10k latest documents about 5s more. So a browse call went from about 14s to about 5s.
  // Both steps are capped at MAX_PREBUILT_RULES_COUNT groups, so the total, the paging and the sort
  // only cover 10,000 rules, and the sidebar count (a cardinality aggregation) is only approximate
  // near 40k (an Acme library of exactly 40,000 rules showed 40,006).
  //
  // Options, best first:
  //  - Preferred: when syncing, stamp every rule that is written with the release it was read from
  //    (for example `library_version`). The current rules of a library are then a plain filter,
  //    library_id = X AND library_version = <the library's version>, with no aggregation, real
  //    from/size paging, an exact total and exact counts. Older versions stay for diffs and upgrades.
  //    It needs one re-sync per library, and a way to treat assets saved before libraries existed.
  //  - An `is_latest` flag set at sync time. Same read path, but superseded versions have to be
  //    un-flagged on every sync.
  //  - One small "latest" document per (library, rule), overwritten on every sync.
  //  - Caching the latest versions per library version in memory. It does not fix the cap or the counts.
  const latestVersionSpecifiersResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource,
    {
      rules: AggregationsMultiBucketAggregateBase<{
        // [rule_id, library_id] for the library query, the rule_id otherwise.
        key: string | string[];
        latest_version: {
          hits?: SearchHitsMetadata<{
            [PREBUILT_RULE_ASSETS_SO_TYPE]: RuleVersionSpecifier;
          }>;
          value?: number | null;
        };
      }>;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: [savedObjectsClient.getCurrentNamespace() ?? 'default'],
    _source: false,
    size: 0,
    query: {
      bool: prepareQueryDslFilter({ ruleIds, excludeRuleIds: deprecatedRuleIds, libraryIds }),
    },
    aggs: {
      rules: libraryIds?.length
        ? {
            multi_terms: {
              terms: [
                { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id` },
                { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id` },
              ],
              size: MAX_PREBUILT_RULES_COUNT,
            },
            // The saved object id is built from rule, library and version, so the highest version
            // number is enough. It is much cheaper than reading the latest document of each group.
            aggs: { latest_version: { max: { field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.version` } } },
          }
        : {
            terms: {
              field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
              size: MAX_PREBUILT_RULES_COUNT,
            },
            aggs: latestVersionAgg(),
          },
    },
  });

  const buckets = latestVersionSpecifiersResult.aggregations?.rules?.buckets;

  invariant(
    Array.isArray(buckets),
    'fetchLatestVersionSpecifiers: expected buckets to be an array'
  );

  const latestVersionSpecifiers: RuleVersionSpecifier[] = buckets.flatMap((bucket) => {
    if (Array.isArray(bucket.key)) {
      const [ruleId, libraryId] = bucket.key;
      const version = bucket.latest_version.value;
      return typeof version === 'number'
        ? [{ rule_id: ruleId, version, library_id: libraryId }]
        : [];
    }

    const hit = bucket.latest_version.hits?.hits[0];
    const hitSource = hit?._source;

    invariant(hitSource, 'fetchLatestVersionSpecifiers: expected hit source to be defined');

    const soAttributes = hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];

    return [
      {
        rule_id: soAttributes.rule_id,
        version: soAttributes.version,
        library_id: soAttributes.library_id,
      },
    ];
  });

  return latestVersionSpecifiers;
}

const latestVersionAgg = () => ({
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
        `${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`,
      ],
    },
  },
});

async function fetchVersionsBySoIds(
  savedObjectsClient: SavedObjectsClientContract,
  soIds: string[],
  sort?: PrebuiltRuleAssetsSort,
  additionalFilter?: string
) {
  const filter: ESFilter[] = [{ terms: { _id: soIds } }];

  if (additionalFilter) {
    filter.push(...prepareQueryDslFilter({ filter: additionalFilter }).filter);
  }

  const searchResult = await savedObjectsClient.search<
    SavedObjectsRawDocSource & {
      [PREBUILT_RULE_ASSETS_SO_TYPE]: BasicRuleInfo;
    }
  >({
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    size: MAX_PREBUILT_RULES_COUNT,
    runtime_mappings: PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
    query: {
      bool: {
        filter,
      },
    },
    sort: prepareQueryDslSort(sort),
    _source: [
      `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
      `${PREBUILT_RULE_ASSETS_SO_TYPE}.version`,
      `${PREBUILT_RULE_ASSETS_SO_TYPE}.type`,
      `${PREBUILT_RULE_ASSETS_SO_TYPE}.library_id`,
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
      ...(soAttributes.library_id ? { library_id: soAttributes.library_id } : {}),
    };
    return versionInfo;
  });

  return latestVersions;
}
