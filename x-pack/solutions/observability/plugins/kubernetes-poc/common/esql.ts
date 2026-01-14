/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generic ES|QL query request
 */
export interface EsqlQueryRequest {
  query: string;
  from?: string;
  to?: string;
}

/**
 * Column metadata from ES|QL response
 */
export interface EsqlColumn {
  name: string;
  type: string;
}

/**
 * Generic ES|QL query response with typed rows
 * Values are returned as an array of objects (key-value pairs)
 */
export interface EsqlQueryResponse {
  columns: EsqlColumn[];
  rows: Array<Record<string, unknown>>;
}
