/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

/** The ES|QL type of the output column that an entry of an `esql_output_columns` item is tested on. */
export const columnType = t.keyof({
  keyword: null,
  text: null,
  integer: null,
  long: null,
  unsigned_long: null,
  double: null,
  boolean: null,
  ip: null,
  version: null,
  date: null,
  date_nanos: null,
});
export type ColumnType = t.TypeOf<typeof columnType>;

export const columnTypeOrUndefined = t.union([columnType, t.undefined]);
export type ColumnTypeOrUndefined = t.TypeOf<typeof columnTypeOrUndefined>;
