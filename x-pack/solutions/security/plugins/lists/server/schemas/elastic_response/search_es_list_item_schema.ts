/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  created_at,
  created_by,
  deserializerOrUndefined,
  list_id,
  nullableMetaOrUndefined,
  serializerOrUndefined,
  tie_breaker_id,
  timestampFromEsResponse,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  binaryOrUndefined,
  booleanOrUndefined,
  byteOrUndefined,
  dateNanosOrUndefined,
  dateOrUndefined,
  dateRangeOrUndefined,
  doubleOrUndefined,
  doubleRangeOrUndefined,
  floatOrUndefined,
  floatRangeOrUndefined,
  geoPointOrUndefined,
  geoShapeOrUndefined,
  halfFloatOrUndefined,
  integerOrUndefined,
  integerRangeOrUndefined,
  ipOrUndefined,
  ipRangeOrUndefined,
  keywordOrUndefined,
  longOrUndefined,
  longRangeOrUndefined,
  shapeOrUndefined,
  shortOrUndefined,
  textOrUndefined,
} from '../common/schemas';

export const searchEsListItemSchema = t.exact(
  t.type({
    '@timestamp': timestampFromEsResponse,
    binary: binaryOrUndefined,
    boolean: booleanOrUndefined,
    byte: byteOrUndefined,
    created_at,
    created_by,
    date: dateOrUndefined,
    date_nanos: dateNanosOrUndefined,
    date_range: dateRangeOrUndefined,
    deserializer: deserializerOrUndefined,
    double: doubleOrUndefined,
    double_range: doubleRangeOrUndefined,
    float: floatOrUndefined,
    float_range: floatRangeOrUndefined,
    geo_point: geoPointOrUndefined,
    geo_shape: geoShapeOrUndefined,
    half_float: halfFloatOrUndefined,
    integer: integerOrUndefined,
    integer_range: integerRangeOrUndefined,
    ip: ipOrUndefined,
    ip_range: ipRangeOrUndefined,
    keyword: keywordOrUndefined,
    list_id,
    long: longOrUndefined,
    long_range: longRangeOrUndefined,
    meta: nullableMetaOrUndefined,
    serializer: serializerOrUndefined,
    shape: shapeOrUndefined,
    short: shortOrUndefined,
    text: textOrUndefined,
    tie_breaker_id,
    updated_at,
    updated_by,
  })
);

export type SearchEsListItemSchema = t.TypeOf<typeof searchEsListItemSchema>;
