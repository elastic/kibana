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
import { formatLookupValue } from './format_lookup_value';
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

/** The stamp fields `_find` can sort on, with the field type to assume where unmapped. */
const STAMP_SORT_FIELDS: Record<string, 'date' | 'keyword'> = {
  created_at: 'date',
  created_by: 'keyword',
  updated_at: 'date',
  updated_by: 'keyword',
};

/** Documents skipped per search while walking from a cursor position to a page start. */
const HOP_SIZE = 100;

export const buildLookupListItem = ({
  listId,
  type,
  value,
  user,
  stamps,
}: {
  listId: string;
  type: Type;
  value: string;
  user: string;
  stamps?: LookupItemStamps;
}): ListItemSchema => {
  const now = new Date().toISOString();
  return {
    // creation time, as on the shared stream
    '@timestamp': stamps?.created_at ?? now,
    _version: undefined,
    created_at: stamps?.created_at ?? now,
    created_by: stamps?.created_by ?? user,
    id: lookupItemId(type, value, listId),
    list_id: listId,
    meta: undefined,
    tie_breaker_id: lookupItemId(type, value, listId),
    type,
    updated_at: stamps?.updated_at ?? now,
    updated_by: stamps?.updated_by ?? user,
    value,
  };
};

/** Who wrote a lookup item and when, as stored on its document. */
export interface LookupItemStamps {
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

/** The stored shape of a lookup item document, as far as the item routes read it. */
export type LookupItemSource = { value?: unknown } & LookupItemStamps;

export const LOOKUP_ITEM_SOURCE = ['value', 'created_at', 'created_by', 'updated_at', 'updated_by'];

/** The stamps stored on a lookup item document, as the item routes return them. */
export const stampsOf = (source: LookupItemSource | undefined): LookupItemStamps => ({
  created_at: source?.created_at,
  created_by: source?.created_by,
  updated_at: source?.updated_at,
  updated_by: source?.updated_by,
});

interface LocatedLookupItem {
  /** The concrete index the document lives in. */
  index: string;
  stamps: LookupItemStamps;
  value: string;
}

/** The access name (alias, else concrete index) of every lookup list recorded in the space's container. */
const lookupAccessNamesInSpace = async (
  esClient: ElasticsearchClient,
  listIndex: string
): Promise<string[]> => {
  const response = await esClient.search<SearchEsListSchema>({
    _source: ['storage'],
    index: listIndex,
    query: { term: { 'storage.type': 'lookup_index' } },
    size: 10000,
  });
  return response.hits.hits
    .map((hit) => hit._source?.storage?.locator)
    .map((locator) => locator?.alias ?? locator?.index)
    .filter((name): name is string => name != null);
};

/**
 * Find the document an item id names, across every lookup list in the space. The
 * lists come from the space's own container, never from a name pattern, so a space
 * whose id extends this one (`default-x` for `default`) is never searched. One search
 * per list in a single multi search, so a list the caller cannot read fails its own
 * search and does not hide the others.
 */
export const locateLookupItem = async ({
  esClient,
  id,
  listIndex,
}: {
  esClient: ElasticsearchClient;
  id: string;
  listIndex: string;
}): Promise<LocatedLookupItem | undefined> => {
  const accessNames = await lookupAccessNamesInSpace(esClient, listIndex);
  if (accessNames.length === 0) {
    return undefined;
  }
  const response = await esClient.msearch<LookupItemSource>({
    searches: accessNames.flatMap((index) => [
      { ignore_unavailable: true, index },
      { _source: LOOKUP_ITEM_SOURCE, query: { ids: { values: [id] } }, size: 1 },
    ]),
  });
  for (const item of response.responses) {
    // a list the caller cannot read fails its own search; the others still answer
    const [hit] = 'error' in item ? [] : item.hits.hits;
    if (hit?._index != null && hit._source?.value != null) {
      return {
        index: hit._index,
        stamps: stampsOf(hit._source),
        value: formatLookupValue(hit._source.value),
      };
    }
  }
  return undefined;
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
  // The items table sorts on the stamps or on the value; anything else, or a type whose
  // value cannot be sorted, falls back to write order. A stamp missing on a document
  // written before the stamps existed sorts last, and an index created before them is
  // sorted as if the field were mapped.
  const stampSort = sortField != null ? STAMP_SORT_FIELDS[sortField] : undefined;
  const sort: estypes.Sort =
    stampSort != null
      ? [
          { [sortField as string]: { missing: '_last', order, unmapped_type: stampSort } },
          { _seq_no: 'asc' },
        ]
      : sortField === 'value' && !UNSORTABLE_TYPES.has(type)
      ? [{ value: order }, { _seq_no: 'asc' }]
      : [{ _seq_no: order }];

  const search = (
    size: number,
    after: estypes.SortResults | undefined,
    withSource: boolean
  ): Promise<estypes.SearchResponse<LookupItemSource>> =>
    esClient.search<LookupItemSource>({
      _source: withSource ? LOOKUP_ITEM_SOURCE : false,
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
    .map((hit) => hit._source)
    .filter((source): source is LookupItemSource => source?.value != null)
    .map((source) =>
      buildLookupListItem({
        listId,
        stamps: stampsOf(source),
        type,
        user,
        value: formatLookupValue(source.value),
      })
    );
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
