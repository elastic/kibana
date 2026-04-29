/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldValueQueryBar } from './types';

export const DEFAULT_KQL_QUERY_FIELD_VALUE: Readonly<FieldValueQueryBar> = {
  query: { query: '', language: 'kuery' },
  filters: [],
  saved_id: null,
};

export const DEFAULT_THREAT_MATCH_KQL_QUERY_FIELD_VALUE: Readonly<FieldValueQueryBar> = {
  query: { query: '*:*', language: 'kuery' },
  filters: [],
  saved_id: null,
};

export const DEFAULT_EQL_QUERY_FIELD_VALUE: Readonly<FieldValueQueryBar> = {
  query: { query: '', language: 'eql' },
  filters: [],
  saved_id: null,
};

export const DEFAULT_ESQL_QUERY_FIELD_VALUE: Readonly<FieldValueQueryBar> = {
  query: { query: '', language: 'esql' },
  filters: [],
  saved_id: null,
};
