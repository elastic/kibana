/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { QueryArgs, Row } from '../common';

export type EsqlRunner = (q: string) => Promise<Row[]>;

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

/** Fields an enricher fetched, per entity id. */
export type EnrichedFields = ReadonlyMap<string, Row>;

/** Reads computed fields of the page rows after the sort query. It rejects when it fails. */
export interface PageEnricher {
  /** Row fields it reads. */
  fields: readonly string[];
  fetch: (rows: readonly Row[], args: QueryArgs, ctx: RunContext) => Promise<EnrichedFields>;
}

export interface SortPageContext {
  runQuery: EsqlRunner;
  /** Number of entities in view, from the cached count query. Only large-view plans ask. */
  fetchViewSize: () => Promise<number>;
}

/** Fetches one page of rows plus one, sorted by a column. */
export type SortPageFetcher = (args: QueryArgs, ctx: SortPageContext) => Promise<Row[]>;

/** How the grid reads a column: its sort, if it has one, and the enricher of its values. */
export interface ColumnQuerySpec {
  fetchSortPage?: SortPageFetcher;
  enricher?: PageEnricher;
}
