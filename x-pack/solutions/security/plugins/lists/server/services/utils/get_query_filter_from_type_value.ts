/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import { isEmpty, isObject } from 'lodash/fp';
import type { Type } from '@kbn/securitysolution-io-ts-list-types';

export type QueryFilterType = estypes.QueryDslQueryContainer[];

const GEO_TYPES: readonly Type[] = ['geo_point', 'geo_shape', 'shape'];

const isGeoType = (type: Type): boolean => GEO_TYPES.includes(type);

const RANGE_TYPES: readonly Type[] = [
  'date_range',
  'double_range',
  'float_range',
  'integer_range',
  'ip_range',
  'long_range',
];

const isRangeType = (type: Type): boolean => RANGE_TYPES.includes(type);

/**
 * Given a type, value, and listId, this will return a valid query. For geo types
 * ("geo_point", "geo_shape", "shape") it returns spatial queries; for range types it
 * returns per-value `term` queries (a `term` against a range field matches ranges that
 * contain the value); for "text" it returns a "match" query; otherwise it returns a terms
 * query. For non-geo types, if an array or array of arrays is passed, this will flatten,
 * remove any "null" values, and then the result.
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
  if (isGeoType(type)) {
    // Geo values arrive from the `fields` API as GeoJSON objects, so they must not
    // be run through the `isObject` filtering that the scalar/text paths rely on, and
    // they require spatial (geo_distance / geo_shape / shape) queries rather than terms.
    return getGeoQuery({ listId, type, value });
  }
  const valueFlattened = value
    .flat(Infinity)
    .filter((singleValue) => singleValue != null && !isObject(singleValue));
  if (isEmpty(valueFlattened)) {
    return getEmptyQuery({ listId });
  } else if (isRangeType(type)) {
    // Elasticsearch does not support the plural `terms` query against range fields, so a
    // multi-valued event field must be expanded into one `term` clause per value.
    return getRangeQuery({ listId, type, value });
  } else if (type === 'text') {
    return getTextQuery({ listId, type, value });
  } else {
    return getTermsQuery({ listId, type, value });
  }
};

/**
 * Returns a query against a large range value list. Unlike {@link getTermsQuery}, a
 * multi-valued (array) event field is expanded into one `term` clause per value because
 * Elasticsearch's `terms` query is not supported against range fields. Each clause is named
 * `${index}.${secondIndex}` so the transform step can attribute matched list items back to
 * the originating event value. A `term` against a range field matches ranges containing the
 * value (the default `INTERSECTS` relation).
 * @param value The event values which can be unknown (single scalars or arrays of them)
 * @param type The range list type
 * @param listId The list id
 */
export const getRangeQuery = ({
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
      }
      return [
        ...accum,
        ...itemFlattened.map((flatItem, secondIndex) => ({
          term: { [type]: { _name: `${index}.${secondIndex}`, value: flatItem } },
        })),
      ];
    } else {
      if (item == null || isObject(item)) {
        return accum;
      }
      return [...accum, { term: { [type]: { _name: `${index}.0`, value: item } } }];
    }
  }, []);
  return getShouldQuery({ listId, should });
};

/**
 * Builds a single spatial clause matching list items against one event geo value.
 *  - geo_point: the `fields` API returns a point as GeoJSON `{ type: 'Point', coordinates: [lon, lat] }`.
 *    A `geo_distance` query does not accept GeoJSON, so we pass the `[lon, lat]` coordinates (its array
 *    form) and use the same 1m radius the small-list inline path uses for near-equality matching.
 *  - geo_shape / shape: these queries accept GeoJSON (and WKT) directly as `shape`, so the event value
 *    is passed through unchanged with an `intersects` relation.
 * @param type The geo list type (and the name of the field on the list-item index)
 * @param value A single event geo value (GeoJSON object or string form)
 * @param name The named-query id, formatted as `${index}.${secondIndex}` for the transform step
 */
export const getGeoClause = ({
  type,
  value,
  name,
}: {
  type: Type;
  value: unknown;
  name: string;
}): estypes.QueryDslQueryContainer => {
  if (type === 'geo_point') {
    const point =
      isObject(value) && Array.isArray((value as { coordinates?: unknown }).coordinates)
        ? (value as { coordinates: unknown }).coordinates
        : value;
    // Computed keys widen to an index signature that does not narrow to the specific
    // geo query shape, so cast to the container type (consistent with getShouldQuery).
    return {
      geo_distance: { _name: name, distance: '1m', [type]: point },
    } as estypes.QueryDslQueryContainer;
  }
  const shapeQuery = type === 'shape' ? 'shape' : 'geo_shape';
  return {
    [shapeQuery]: { _name: name, [type]: { relation: 'intersects', shape: value } },
  } as estypes.QueryDslQueryContainer;
};

/**
 * Returns a spatial query against a large geo value list. Each event value maps to a named
 * clause (`${index}.${secondIndex}`) so the transform step can attribute matched list items
 * back to the originating event value. Null values and empty arrays are ignored, and an empty
 * result yields a query that matches nothing.
 * @param value The event values which can be unknown (single geo values or arrays of them)
 * @param type The geo list type
 * @param listId The list id
 */
export const getGeoQuery = ({
  value,
  type,
  listId,
}: {
  value: unknown[];
  type: Type;
  listId: string;
}): QueryFilterType => {
  const should = value.reduce<estypes.QueryDslQueryContainer[]>((accum, item, index) => {
    const items = (Array.isArray(item) ? item : [item]).filter(
      (singleValue) => singleValue != null
    );
    if (items.length === 0) {
      return accum;
    }
    return [
      ...accum,
      ...items.map((singleValue, secondIndex) =>
        getGeoClause({ name: `${index}.${secondIndex}`, type, value: singleValue })
      ),
    ];
  }, []);

  if (should.length === 0) {
    return getEmptyQuery({ listId });
  }

  return getShouldQuery({ listId, should });
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
