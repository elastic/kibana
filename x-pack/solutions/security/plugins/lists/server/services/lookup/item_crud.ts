/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  FoundListItemSchema,
  ListItemSchema,
  ListSchema,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import type { SearchEsListSchema } from '../../schemas/elastic_response';
import { encodeCursor } from '../utils/encode_decode_cursor';
import { getQueryFilter } from '../utils/get_query_filter';
import { transformElasticToList } from '../utils/transform_elastic_to_list';

import { isRangeType } from './build_lookup_mappings';
import { getLookupIndexPattern } from './get_lookup_index';
import { lookupItemId } from './write_lookup_items';

/**
 * Item ids on a lookup list are content addressed: the document id is a hash of the
 * authored value. An id therefore names a value, not a row, and the id changes when
 * the value changes. These helpers give the item routes (get, find, update, patch,
 * delete by id) a working implementation on that model.
 */

/** Types whose `value` column cannot be sorted; find falls back to insertion order. */
const UNSORTABLE_TYPES: ReadonlySet<Type> = new Set([
  'binary',
  'geo_point',
  'geo_shape',
  'shape',
  'text',
]);

/** Documents skipped per search while walking from a cursor position to a page start. */
const HOP_SIZE = 100;

export const buildLookupListItem = ({
  listId,
  type,
  value,
  user,
}: {
  listId: string;
  type: Type;
  value: string;
  user: string;
}): ListItemSchema => {
  const now = new Date().toISOString();
  return {
    '@timestamp': now,
    _version: undefined,
    created_at: now,
    created_by: user,
    id: lookupItemId(type, value),
    list_id: listId,
    meta: undefined,
    tie_breaker_id: lookupItemId(type, value),
    type,
    updated_at: now,
    updated_by: user,
    value,
  };
};

interface LocatedLookupItem {
  /** The concrete index the document lives in. */
  index: string;
  value: string;
}

/**
 * Find the document an item id names, across every lookup list in the space. The
 * search covers both the alias family and the concrete index family, so a shared
 * list is found through its alias and a restricted list through its concrete index
 * when the caller can read it. Wildcards silently skip indices the caller cannot see.
 */
export const locateLookupItem = async ({
  esClient,
  id,
  listItemIndex,
  spaceId,
}: {
  esClient: ElasticsearchClient;
  id: string;
  listItemIndex: string;
  spaceId: string;
}): Promise<LocatedLookupItem | undefined> => {
  const response = await esClient.search<{ value?: unknown }>({
    _source: ['value'],
    allow_no_indices: true,
    expand_wildcards: ['open', 'hidden'],
    ignore_unavailable: true,
    index: [`${listItemIndex}-*`, getLookupIndexPattern(spaceId)],
    query: { ids: { values: [id] } },
    size: 1,
  });
  const [hit] = response.hits.hits;
  if (hit == null || hit._index == null || hit._source?.value == null) {
    return undefined;
  }
  return { index: hit._index, value: String(hit._source.value) };
};

/** The list whose concrete index is `index`, read from the container. */
export const findListByLookupIndex = async ({
  esClient,
  index,
  listIndex,
}: {
  esClient: ElasticsearchClient;
  index: string;
  listIndex: string;
}): Promise<ListSchema | undefined> => {
  const response = await esClient.search<SearchEsListSchema>({
    index: listIndex,
    query: { term: { 'storage.locator.index': index } },
    seq_no_primary_term: true,
    size: 1,
  });
  return transformElasticToList({ response })[0];
};

/**
 * The cursor carries the sort values of the last document served, as strings. The
 * tie breaker is `_seq_no`, a number, so it is restored as one; the `value` sort key
 * stays a string, which Elasticsearch coerces to the field type.
 */
const restoreSearchAfter = (searchAfter: string[] | undefined): estypes.SortResults | undefined => {
  if (searchAfter == null || searchAfter.length === 0) return undefined;
  const values: estypes.SortResults = [...searchAfter];
  values[values.length - 1] = Number(searchAfter[searchAfter.length - 1]);
  return values;
};

/**
 * Paged find over a lookup list's authored values, for the items table. Pages with
 * `search_after`, the same way the shared stream does, so there is no offset window:
 * the cursor records the sort values at the end of the last page served, and a request
 * for a later page walks forward from that position in hops. Sorts on `value` where
 * the type allows it, always with `_seq_no` as tie breaker, which is complete on the
 * single shard. The KQL `filter` is applied as on the shared stream.
 */
export const findLookupItems = async ({
  currentIndexPosition,
  esClient,
  filter,
  index,
  listId,
  page,
  perPage,
  searchAfter,
  sortField,
  sortOrder,
  type,
  user,
}: {
  currentIndexPosition: number;
  esClient: ElasticsearchClient;
  filter: string;
  index: string;
  listId: string;
  page: number;
  perPage: number;
  searchAfter: string[] | undefined;
  sortField: string | undefined;
  sortOrder: 'asc' | 'desc' | undefined;
  type: Type;
  user: string;
}): Promise<FoundListItemSchema> => {
  const must: estypes.QueryDslQueryContainer[] = [];
  if (isRangeType(type)) must.push({ term: { kind: 'source' } });
  if (filter.trim() !== '') must.push(getQueryFilter({ filter }));
  const query: estypes.QueryDslQueryContainer =
    must.length > 0 ? { bool: { filter: must } } : { match_all: {} };

  const order = sortOrder ?? 'asc';
  const sortOnValue = sortField != null && !UNSORTABLE_TYPES.has(type);
  const sort: estypes.Sort = sortOnValue
    ? [{ value: order }, { _seq_no: 'asc' }]
    : [{ _seq_no: order }];

  const search = (
    size: number,
    after: estypes.SortResults | undefined,
    withSource: boolean
  ): Promise<estypes.SearchResponse<{ value?: unknown }>> =>
    esClient.search<{ value?: unknown }>({
      _source: withSource ? ['value'] : false,
      index,
      query,
      search_after: after,
      size,
      sort,
      track_total_hits: false,
    });

  const targetStart = (page - 1) * perPage;
  // Start from the cursor when it lies at or before the page start, else from the top.
  let position =
    searchAfter != null && currentIndexPosition <= targetStart ? currentIndexPosition : 0;
  let after = position > 0 ? restoreSearchAfter(searchAfter) : undefined;
  let reachable = true;
  while (position < targetStart) {
    const hop = Math.min(HOP_SIZE, targetStart - position);
    const skipped = await search(hop, after, false);
    const { hits } = skipped.hits;
    if (hits.length < hop) {
      reachable = false;
      break;
    }
    after = hits[hits.length - 1].sort;
    position += hits.length;
  }

  const [pageResponse, { count: total }] = await Promise.all([
    reachable ? search(perPage, after, true) : undefined,
    esClient.count({ index, query }),
  ]);
  const hits = pageResponse?.hits.hits ?? [];
  const data = hits
    .map((hit) => hit._source?.value)
    .filter((value): value is unknown => value != null)
    .map((value) => buildLookupListItem({ listId, type, user, value: String(value) }));
  const last = hits[hits.length - 1]?.sort;
  return {
    cursor: encodeCursor({
      page,
      perPage,
      searchAfter: last?.map((v) => String(v)),
    }),
    data,
    page,
    per_page: perPage,
    total,
  };
};
