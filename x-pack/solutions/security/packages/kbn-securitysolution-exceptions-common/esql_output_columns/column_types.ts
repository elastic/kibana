/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The ES|QL types of an output column that an exception can be tested on at the end of the query. */
export const ESQL_OUTPUT_COLUMN_TYPES = [
  'keyword',
  'text',
  'integer',
  'long',
  'unsigned_long',
  'double',
  'boolean',
  'ip',
  'version',
  'date',
  'date_nanos',
] as const;

export type EsqlOutputColumnType = (typeof ESQL_OUTPUT_COLUMN_TYPES)[number];

const COLUMN_TYPES: ReadonlySet<string> = new Set(ESQL_OUTPUT_COLUMN_TYPES);

export const isEsqlOutputColumnType = (type: unknown): type is EsqlOutputColumnType =>
  typeof type === 'string' && COLUMN_TYPES.has(type);
