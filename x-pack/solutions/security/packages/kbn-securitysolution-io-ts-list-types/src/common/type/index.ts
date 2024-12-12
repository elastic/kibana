/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as t from 'io-ts';

/**
 * Types of all the regular single value list items but not exception list
 * or exception list types. Those types are in the list_types folder.
 */
export const type = t.keyof({
  binary: null,
  boolean: null,
  byte: null,
  date: null,
  date_nanos: null,
  date_range: null,
  double: null,
  double_range: null,
  float: null,
  float_range: null,
  geo_point: null,
  geo_shape: null,
  half_float: null,
  integer: null,
  integer_range: null,
  ip: null,
  ip_range: null,
  keyword: null,
  long: null,
  long_range: null,
  shape: null,
  short: null,
  text: null,
});

export const typeOrUndefined = t.union([type, t.undefined]);
export type Type = t.TypeOf<typeof type>;
export type TypeOrUndefined = t.TypeOf<typeof typeOrUndefined>;
