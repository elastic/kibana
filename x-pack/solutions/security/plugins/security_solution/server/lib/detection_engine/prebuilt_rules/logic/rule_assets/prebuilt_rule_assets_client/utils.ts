/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import { chunk } from 'lodash';
import type { ESFilter } from '@kbn/es-types';
import type { Sort } from '@elastic/elasticsearch/lib/api/types';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { PrebuiltRuleAssetsFilter } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_filter';
import type { PrebuiltRuleAssetsSort } from '../../../../../../../common/api/detection_engine/prebuilt_rules/common/prebuilt_rule_assets_sort';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from '../prebuilt_rule_assets_type';

export function prepareQueryDslFilter(
  ruleIds?: string[],
  filter?: PrebuiltRuleAssetsFilter
): ESFilter[] {
  const queryFilter: ESFilter[] = [];

  if (ruleIds) {
    queryFilter.push({
      terms: {
        [`${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`]: ruleIds,
      },
    });
  }

  if (filter?.fields?.name?.include?.values) {
    filter.fields.name.include.values.forEach((name) => {
      queryFilter.push({
        wildcard: {
          [`${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`]: `*${name}*`,
        },
      });
    });
  }

  if (filter?.fields.tags?.include?.values) {
    filter.fields.tags.include.values.forEach((tag) => {
      queryFilter.push({
        term: {
          [`${PREBUILT_RULE_ASSETS_SO_TYPE}.tags`]: tag,
        },
      });
    });
  }
  return queryFilter;
}

export function prepareQueryDslSort(sort?: PrebuiltRuleAssetsSort): Sort | undefined {
  const soSortFields = {
    name: `${PREBUILT_RULE_ASSETS_SO_TYPE}.name.keyword`,
    severity: `${PREBUILT_RULE_ASSETS_SO_TYPE}.severity_rank`,
    risk_score: `${PREBUILT_RULE_ASSETS_SO_TYPE}.risk_score`,
  };

  return sort?.map((s) => {
    return { [soSortFields[s.field]]: s.order };
  });
}

/**
 * `savedObjectsClient.search` method requires a non-empty "namespaces" parameter even if you want to search for space-agnostic SO types.
 * This function returns the current namespace to be passed as "namespaces" parameter.
 */
export function getPrebuiltRuleAssetsSearchNamespace(
  savedObjectsClient: SavedObjectsClientContract
) {
  return [savedObjectsClient.getCurrentNamespace() ?? 'default'];
}

export function getPrebuiltRuleAssetSoId(ruleId: string, version: number): string {
  return `${PREBUILT_RULE_ASSETS_SO_TYPE}:${ruleId}_${version}`;
}

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
export function createChunkedFilters<T>({
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

export const RULE_ASSET_ATTRIBUTES = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes`;
const ES_MAX_CLAUSE_COUNT = 1024;
const ES_MAX_CONCURRENT_REQUESTS = 2;

/**
 * Fetches objects using a provided function.
 * If filters are provided fetches concurrently in chunks.
 *
 * @param {(filter?: string) => Promise<T[]>} chunkFetchFn - Function that fetches a chunk.
 * @param {string[]} [filters] - An optional array of filter strings. If provided, `chunkFetchFn` will be called for each filter concurrently.
 * @returns {Promise<T[]>} A promise that resolves to an array of fetched objects.
 */
export function chunkedFetch<T>(
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
