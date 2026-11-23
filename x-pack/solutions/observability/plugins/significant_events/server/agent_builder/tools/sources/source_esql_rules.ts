/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** What a source's ES|QL query may contain, for the tools that take one. */
export const SOURCE_ESQL_RULES =
  'A `FROM` (or `TS`) source command, optionally followed by `WHERE` filters and nothing else. All its indices must hold the same kind of data, for example logs. The query output must include a `@timestamp` column of type date or date_nanos, otherwise it is refused. A single index or wildcard with no data behind it yet is accepted, but a list that names a missing concrete index is refused.';
