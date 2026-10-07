/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type {
  FoundAllListItemsSchema,
  SearchListItemArraySchema,
  Type,
} from '@kbn/securitysolution-io-ts-list-types';

import { isRangeType } from './build_lookup_mappings';
import { LOOKUP_ITEM_SOURCE, buildLookupListItem, stampsOf } from './item_crud';
import type { LookupItemSource, LookupItemStamps } from './item_crud';
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

type Scalar = string | number | boolean;

const isScalar = (value: unknown): value is Scalar => value != null && typeof value !== 'object';

/**
 * An event value is a scalar or an array (a `fields` value is always an array, and may
 * nest). Flatten and drop nulls and objects, as the shared stream's query builder does.
 */
const flattenEventValue = (value: unknown): Scalar[] =>
  (Array.isArray(value) ? value.flat(Infinity) : [value]).filter(isScalar);

/**
 * The clauses for one event value, named `${valueIndex}.${elementIndex}` as the shared
 * stream names them, with the same clause count: one `terms` (or `term`) per value on
 * the typed field, so an array field costs one clause, not one per element. Range lists
 * query the `src_range` field, a range type that a `terms` query matches by containment,
 * exactly as the shared stream queries its range column. `text` uses one `match` per
 * element, as the shared stream does.
 */
const clausesForValue = (
  type: Type,
  valueIndex: number,
  value: unknown,
  elements: Scalar[]
): estypes.QueryDslQueryContainer[] => {
  const field = isRangeType(type) ? 'src_range' : 'value';
  if (type === 'text') {
    return elements.map((element, elementIndex) => ({
      match: { value: { _name: `${valueIndex}.${elementIndex}`, operator: 'and', query: element } },
    }));
  }
  // an array value is a `terms` clause even with one element, a scalar a `term`
  const name = `${valueIndex}.0`;
  return Array.isArray(value)
    ? [{ terms: { _name: name, [field]: elements } }]
    : [{ term: { [field]: { _name: name, value: elements[0] } } }];
};

const matchedNames = (hit: estypes.SearchHit): string[] => {
  const matched = hit.matched_queries;
  return Array.isArray(matched) ? matched : Object.keys(matched ?? {});
};

/**
 * Post-filter exception path: given the event values of a page, returns which are in
 * the list, in the same shape as the shared stream's `searchListItemByValues`: one
 * entry per input value, holding the input value untouched (the executor compares it
 * by identity to the event field) and the matched list items, empty when none matched.
 *
 * Equality is decided by Elasticsearch under the field type (an `ip` field matches
 * `::1` against `0:0:0:0:0:0:0:1`) and read back from `matched_queries`, never by string
 * comparison against the stored spelling.
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
  const elements = values.map(flattenEventValue);
  const should = elements.flatMap((scalars, valueIndex) =>
    scalars.length === 0 ? [] : clausesForValue(type, valueIndex, values[valueIndex], scalars)
  );

  // the stamps of the first document that matched each value, so a read by value
  // returns what is stored rather than the request time
  const matched = new Map<string, LookupItemStamps>();
  if (should.length > 0) {
    const response = await esClient.search<LookupItemSource>({
      _source: LOOKUP_ITEM_SOURCE,
      index,
      query: { bool: { minimum_should_match: 1, should } },
      size: 10000,
    });
    for (const hit of response.hits.hits) {
      for (const name of matchedNames(hit)) {
        const [valueIndex] = name.split('.');
        if (!matched.has(valueIndex)) matched.set(valueIndex, stampsOf(hit._source));
      }
    }
  }

  return values.map((value, valueIndex) => {
    const stamps = matched.get(`${valueIndex}`);
    return {
      items:
        stamps != null
          ? elements[valueIndex].map((scalar) =>
              buildLookupListItem({ listId, stamps, type, user, value: String(scalar) })
            )
          : [],
      value,
    };
  });
};
