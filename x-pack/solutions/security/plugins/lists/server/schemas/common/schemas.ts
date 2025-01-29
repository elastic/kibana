/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import * as t from 'io-ts';

export const binary = t.string;
export const binaryOrUndefined = t.union([binary, t.undefined]);

export const boolean = t.string;
export const booleanOrUndefined = t.union([boolean, t.undefined]);

export const byte = t.string;
export const byteOrUndefined = t.union([byte, t.undefined]);

export const date = t.string;
export const dateOrUndefined = t.union([date, t.undefined]);

export const date_nanos = t.string;
export const dateNanosOrUndefined = t.union([date_nanos, t.undefined]);

export const double = t.string;
export const doubleOrUndefined = t.union([double, t.undefined]);

export const float = t.string;
export const floatOrUndefined = t.union([float, t.undefined]);

export const geo_shape = t.string;
export const geoShapeOrUndefined = t.union([geo_shape, t.undefined]);

export const half_float = t.string;
export const halfFloatOrUndefined = t.union([half_float, t.undefined]);

export const integer = t.string;
export const integerOrUndefined = t.union([integer, t.undefined]);

export const ip = t.string;
export const ipOrUndefined = t.union([ip, t.undefined]);

export const keyword = t.string;
export const keywordOrUndefined = t.union([keyword, t.undefined]);

export const text = t.string;
export const textOrUndefined = t.union([text, t.undefined]);

export const long = t.string;
export const longOrUndefined = t.union([long, t.undefined]);

export const shape = t.string;
export const shapeOrUndefined = t.union([shape, t.undefined]);

export const short = t.string;
export const shortOrUndefined = t.union([short, t.undefined]);

export const esDataTypeRange = t.exact(t.type({ gte: t.string, lte: t.string }));

export const date_range = esDataTypeRange;
export const dateRangeOrUndefined = t.union([date_range, t.undefined]);

export const double_range = esDataTypeRange;
export const doubleRangeOrUndefined = t.union([double_range, t.undefined]);

export const float_range = esDataTypeRange;
export const floatRangeOrUndefined = t.union([float_range, t.undefined]);

export const integer_range = esDataTypeRange;
export const integerRangeOrUndefined = t.union([integer_range, t.undefined]);

// ip_range can be just a CIDR value as a range
export const ip_range = t.union([esDataTypeRange, t.string]);
export const ipRangeOrUndefined = t.union([ip_range, t.undefined]);

export const long_range = esDataTypeRange;
export const longRangeOrUndefined = t.union([long_range, t.undefined]);

export type EsDataTypeRange = t.TypeOf<typeof esDataTypeRange>;

export const esDataTypeRangeTerm = t.union([
  t.exact(t.type({ date_range })),
  t.exact(t.type({ double_range })),
  t.exact(t.type({ float_range })),
  t.exact(t.type({ integer_range })),
  t.exact(t.type({ ip_range })),
  t.exact(t.type({ long_range })),
]);

export type EsDataTypeRangeTerm = t.TypeOf<typeof esDataTypeRangeTerm>;

export const esDataTypeGeoPointRange = t.exact(t.type({ lat: t.string, lon: t.string }));
export type EsDataTypeGeoPointRange = t.TypeOf<typeof esDataTypeGeoPointRange>;

export const geo_point = t.union([esDataTypeGeoPointRange, t.string]);
export type GeoPoint = t.TypeOf<typeof geo_point>;

export const geoPointOrUndefined = t.union([geo_point, t.undefined]);

export const esDataTypeGeoPoint = t.exact(t.type({ geo_point }));
export type EsDataTypeGeoPoint = t.TypeOf<typeof esDataTypeGeoPoint>;

export const esDataTypeGeoShape = t.union([
  t.exact(t.type({ geo_shape: t.string })),
  t.exact(t.type({ shape: t.string })),
]);

export type EsDataTypeGeoShape = t.TypeOf<typeof esDataTypeGeoShape>;

export const esDataTypeSingle = t.union([
  t.exact(t.type({ binary })),
  t.exact(t.type({ boolean })),
  t.exact(t.type({ byte })),
  t.exact(t.type({ date })),
  t.exact(t.type({ date_nanos })),
  t.exact(t.type({ double })),
  t.exact(t.type({ float })),
  t.exact(t.type({ half_float })),
  t.exact(t.type({ integer })),
  t.exact(t.type({ ip })),
  t.exact(t.type({ keyword })),
  t.exact(t.type({ long })),
  t.exact(t.type({ short })),
  t.exact(t.type({ text })),
]);

export type EsDataTypeSingle = t.TypeOf<typeof esDataTypeSingle>;

export const esDataTypeUnion = t.union([
  esDataTypeRangeTerm,
  esDataTypeGeoPoint,
  esDataTypeGeoShape,
  esDataTypeSingle,
]);

export type EsDataTypeUnion = t.TypeOf<typeof esDataTypeUnion>;

export const _index = t.string;
