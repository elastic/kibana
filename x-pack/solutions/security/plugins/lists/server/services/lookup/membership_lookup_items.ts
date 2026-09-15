/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  FoundAllListItemsSchema,
  SearchListItemArraySchema,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import { isRangeType } from './build_lookup_mappings';
import { buildLookupListItem } from './item_crud';
import { readLookupItemValues } from './read_lookup_items';

/**
 * Inline exception path: returns every authored value of the lookup list as list
 * items, so `buildListClause` can build the terms/range DSL on the event field.
 */
export const findAllLookupItems = async ({
  esClient,
  index,
  listId,
  type,
  user,
}: {
  esClient: ElasticsearchClient;
  index: string;
  listId: string;
  type: Type;
  user: string;
}): Promise<FoundAllListItemsSchema> => {
  const values = await readLookupItemValues({ esClient, index, type });
  const data = values.map((value) => buildLookupListItem({ listId, type, user, value }));
  return { data, total: data.length };
};

/**
 * Post-filter exception path: given a page of event values, returns which are in
 * the list. Equality types match by a terms query on `value`; range types check
 * containment against the source bounds, which are the source of truth. Reading the
 * sources rather than the coalesced cache keeps membership correct even while a
 * concurrent edit leaves the coalesced set momentarily inconsistent, since an
 * existence check does not care about the duplicates that overlapping sources
 * produce. The disjoint coalesced set exists only for the future join.
 */
export const searchLookupItemsByValues = async ({
  esClient,
  index,
  listId,
  type,
  user,
  values,
}: {
  esClient: ElasticsearchClient;
  index: string;
  listId: string;
  type: Type;
  user: string;
  values: unknown[];
}): Promise<SearchListItemArraySchema> => {
  const stringValues = values.filter((v): v is string | number => v != null).map((v) => String(v));

  if (isRangeType(type)) {
    // one containment check per event value against the source bounds (the truth)
    return Promise.all(
      stringValues.map(async (value) => {
        const hit = await esClient.search({
          index,
          query: {
            bool: {
              filter: [
                { term: { kind: 'source' } },
                { range: { src_start: { lte: value } } },
                { range: { src_end: { gte: value } } },
              ],
            },
          },
          size: 1,
          terminate_after: 1,
        });
        const matched = (hit.hits.total as { value: number } | undefined)?.value ?? 0;
        return {
          items: matched > 0 ? [buildLookupListItem({ listId, type, user, value })] : [],
          value,
        };
      })
    );
  }

  const response = await esClient.search<{ value: unknown }>({
    _source: ['value'],
    index,
    query: { terms: { value: stringValues } },
    size: 10000,
  });
  const found = new Set(response.hits.hits.map((h) => String(h._source?.value)));
  return stringValues.map((value) => ({
    items: found.has(value) ? [buildLookupListItem({ listId, type, user, value })] : [],
    value,
  }));
};
