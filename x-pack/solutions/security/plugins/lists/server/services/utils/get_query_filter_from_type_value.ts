/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { isEmpty, isObject } from 'lodash/fp';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

export type QueryFilterType = estypes.QueryDslQueryContainer[];

/**
 * Given a type, value, and listId, this will return a valid query. If the type is
 * "text" it will return a "text" match, otherwise it returns a terms query. If an
 * array or array of arrays is passed, this will flatten, remove any "null" values,
 * and then the result.
 * @param type The type of list
 * @param value The unknown value
 * @param listId The list id
 */
export const getQueryFilterFromTypeValue = ({
  type,
  value,
  listId,
}: {
  type: Type;
  value: unknown[];
  listId: string;
}): QueryFilterType => {
  const valueFlattened = value
    .flat(Infinity)
    .filter((singleValue) => singleValue != null && !isObject(singleValue));
  if (isEmpty(valueFlattened)) {
    return getEmptyQuery({ listId });
  } else if (type === 'text') {
    return getTextQuery({ listId, type, value });
  } else {
    return getTermsQuery({ listId, type, value });
  }
};

/**
 * Returns an empty named query that should not match anything
 * @param listId The list id to associate with the empty query
 */
export const getEmptyQuery = ({ listId }: { listId: string }): QueryFilterType => [
  { term: { list_id: listId } },
  {
    bool: {
      minimum_should_match: 1,
      should: [
        {
          match_none: {
            _name: 'empty',
          },
        },
      ],
    },
  },
];

/**
 * Returns a terms query against a large value based list. If it detects that an array or item has a "null"
 * value it will filter that value out. If it has arrays within arrays it will flatten those out as well.
 * @param value The value which can be unknown
 * @param type The list type type
 * @param listId The list id
 */
export const getTermsQuery = ({
  value,
  type,
  listId,
}: {
  value: unknown[];
  type: Type;
  listId: string;
}): QueryFilterType => {
  const should = value.reduce<unknown[]>((accum, item, index) => {
    if (Array.isArray(item)) {
      const itemFlattened = item
        .flat(Infinity)
        .filter((singleValue) => singleValue != null && !isObject(singleValue));
      if (itemFlattened.length === 0) {
        return accum;
      } else {
        return [...accum, { terms: { _name: `${index}.0`, [type]: itemFlattened } }];
      }
    } else {
      if (item == null || isObject(item)) {
        return accum;
      } else {
        return [...accum, { term: { [type]: { _name: `${index}.0`, value: item } } }];
      }
    }
  }, []);
  return getShouldQuery({ listId, should });
};

/**
 * Returns a text query against a large value based list. If it detects that an array or item has a "null"
 * value it will filter that value out. If it has arrays within arrays it will flatten those out as well.
 * @param value The value which can be unknown
 * @param type The list type type
 * @param listId The list id
 */
export const getTextQuery = ({
  value,
  type,
  listId,
}: {
  value: unknown[];
  type: Type;
  listId: string;
}): QueryFilterType => {
  const should = value.reduce<unknown[]>((accum, item, index) => {
    if (Array.isArray(item)) {
      const itemFlattened = item
        .flat(Infinity)
        .filter((singleValue) => singleValue != null && !isObject(singleValue));
      if (itemFlattened.length === 0) {
        return accum;
      } else {
        return [
          ...accum,
          ...itemFlattened.map((flatItem, secondIndex) => ({
            match: {
              [type]: { _name: `${index}.${secondIndex}`, operator: 'and', query: flatItem },
            },
          })),
        ];
      }
    } else {
      if (item == null || isObject(item)) {
        return accum;
      } else {
        return [
          ...accum,
          { match: { [type]: { _name: `${index}.0`, operator: 'and', query: item } } },
        ];
      }
    }
  }, []);

  return getShouldQuery({ listId, should });
};

/**
 * Given an unknown should this constructs a simple bool and terms with the should
 * clause/query.
 * @param listId The list id to query against
 * @param should The unknown should to construct the query against
 */
export const getShouldQuery = ({
  listId,
  should,
}: {
  listId: string;
  should: unknown;
}): QueryFilterType => {
  return [
    { term: { list_id: listId } },
    {
      bool: {
        minimum_should_match: 1,
        // @ts-expect-error unknown is not assignable to estypes.QueryDslQueryContainer
        should,
      },
    },
  ];
};
