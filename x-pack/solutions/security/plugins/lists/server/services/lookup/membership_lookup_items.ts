/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  FoundAllListItemsSchema,
  ListItemSchema,
  SearchListItemArraySchema,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import { isRangeType } from './build_lookup_mappings';
import { readLookupItemValues } from './read_lookup_items';

const buildListItem = (listId: string, type: Type, value: string, user: string): ListItemSchema => {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    _version: undefined,
    created_at: now,
    created_by: user,
    id: uuidv4(),
    list_id: listId,
    meta: undefined,
    tie_breaker_id: uuidv4(),
    type,
    updated_at: now,
    updated_by: user,
    value,
  };
};

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
  const data = values.map((value) => buildListItem(listId, type, value, user));
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
          items: matched > 0 ? [buildListItem(listId, type, value, user)] : [],
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
    items: found.has(value) ? [buildListItem(listId, type, value, user)] : [],
    value,
  }));
};
