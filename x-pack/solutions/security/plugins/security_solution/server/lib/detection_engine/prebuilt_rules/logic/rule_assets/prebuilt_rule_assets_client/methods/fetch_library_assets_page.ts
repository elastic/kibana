/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SortCombinations,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract, SavedObjectsRawDocSource } from '@kbn/core/server';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../../common/api/detection_engine/prebuilt_rules/review_rule_installation/review_rule_installation_route.gen';
import { invariant } from '../../../../../../../../common/utils/invariant';
import type {
  PrebuiltRuleAsset,
  PrebuiltRuleAssetRecord,
} from '../../../../model/rule_assets/prebuilt_rule_asset';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../../prebuilt_rule_assets_type';
import { validatePrebuiltRuleAssets } from '../../prebuilt_rule_assets_validation';
import { buildPrebuiltRuleAssetSourceIncludes } from '../build_source_includes';
import type { LibraryRelease } from './library_release_filter';
import { buildLibraryReleaseFilter, hasSyncedLibrary } from './library_release_filter';
import {
  PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
  getPrebuiltRuleAssetsSearchNamespace,
  prepareQueryDslFilter,
  prepareQueryDslSort,
} from '../utils';

// Elasticsearch does not return a hit beyond this position of a result with from and size.
const MAX_RESULT_WINDOW = 10_000;

const FIELD = (name: string) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.${name}`;

// Makes the order of the results total, which paging with search_after needs. A rule is in a release once.
const SORT_TIEBREAKERS: SortCombinations[] = [
  { [FIELD('library_id')]: 'asc' },
  { [FIELD('rule_id')]: 'asc' },
];

export interface FetchLibraryAssetsPageParams {
  libraries: readonly LibraryRelease[];
  // KQL, for example the search of the rules table.
  filter?: string;
  sort?: PrebuiltRuleAssetsSort;
  page: number;
  perPage: number;
  fields?: string[];
}

export interface LibraryAssetsPage {
  assets: PrebuiltRuleAssetRecord[];
  // All the rules that match, not only the ones on the page.
  total: number;
}

const buildQuery = (
  libraries: readonly LibraryRelease[],
  filter: string | undefined
): QueryDslQueryContainer => ({
  bool: {
    filter: [buildLibraryReleaseFilter(libraries), ...prepareQueryDslFilter({ filter }).filter],
    must_not: { term: { [FIELD('deprecated')]: true } },
  },
});

const toTotal = (total: number | { value: number } | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;

export async function fetchLibraryAssetsPage(
  savedObjectsClient: SavedObjectsClientContract,
  { libraries, filter, sort, page, perPage, fields }: FetchLibraryAssetsPageParams
): Promise<LibraryAssetsPage> {
  if (!hasSyncedLibrary(libraries)) {
    return { assets: [], total: 0 };
  }

  const baseRequest = {
    type: PREBUILT_RULE_ASSETS_SO_TYPE,
    namespaces: getPrebuiltRuleAssetsSearchNamespace(savedObjectsClient),
    query: buildQuery(libraries, filter),
    runtime_mappings: PREBUILT_RULE_ASSETS_RUNTIME_MAPPINGS,
    sort: ([] as SortCombinations[]).concat(prepareQueryDslSort(sort) ?? [], SORT_TIEBREAKERS),
    track_total_hits: true,
  };
  const offset = (page - 1) * perPage;

  // A page within the first 10,000 rules is read with from and size. A deeper page starts after the rule
  // that comes before it, which is found by reading the sort values of the ones in between.
  let searchAfter: SortResults | undefined;
  if (offset + perPage > MAX_RESULT_WINDOW) {
    const skipped = await findSortValuesBefore(savedObjectsClient, baseRequest, offset);
    if (!skipped.searchAfter) {
      return { assets: [], total: skipped.total };
    }
    searchAfter = skipped.searchAfter;
  }

  const sourceIncludes = buildPrebuiltRuleAssetSourceIncludes(fields);
  const result = await savedObjectsClient.search<
    SavedObjectsRawDocSource & { [PREBUILT_RULE_ASSETS_SO_TYPE]: PrebuiltRuleAsset }
  >({
    ...baseRequest,
    ...(sourceIncludes ? { _source: { includes: sourceIncludes } } : {}),
    size: perPage,
    ...(searchAfter ? { search_after: searchAfter } : { from: offset }),
  });

  const assets = result.hits.hits.map((hit) => {
    const hitSource = hit._source;
    invariant(hitSource, 'Expected hit source to be defined');
    return hitSource[PREBUILT_RULE_ASSETS_SO_TYPE];
  });

  return { assets: validatePrebuiltRuleAssets(assets), total: toTotal(result.hits.total) };
}

async function findSortValuesBefore(
  savedObjectsClient: SavedObjectsClientContract,
  baseRequest: Parameters<SavedObjectsClientContract['search']>[0],
  offset: number
): Promise<{ searchAfter?: SortResults; total: number }> {
  let searchAfter: SortResults | undefined;
  let skipped = 0;
  let total = 0;

  while (skipped < offset) {
    const size = Math.min(MAX_RESULT_WINDOW, offset - skipped);
    const result = await savedObjectsClient.search({
      ...baseRequest,
      _source: false,
      size,
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    total = toTotal(result.hits.total);

    const { hits } = result.hits;
    const lastSort = hits[hits.length - 1]?.sort;
    // Fewer rules than the page starts after, so there is nothing to show.
    if (hits.length < size || !lastSort) {
      return { total };
    }
    searchAfter = lastSort;
    skipped += hits.length;
  }

  return { searchAfter, total };
}
