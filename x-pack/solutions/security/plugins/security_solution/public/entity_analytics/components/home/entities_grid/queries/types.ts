/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { QueryArgs, Row } from '../common';

export type EsqlRunner = (steps: readonly string[]) => Promise<Row[]>;

export interface RunContext {
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

export type EnrichedFields = ReadonlyMap<string, Row>;

export interface PageEnricher {
  /** The row fields it sets. It is skipped when the sort query already read them. */
  fields: readonly string[];
  /** Fetches those fields for the page rows, per entity id. Rejects when its query fails. */
  fetch: (rows: readonly Row[], args: QueryArgs, ctx: RunContext) => Promise<EnrichedFields>;
}

export interface SortPageContext {
  runQuery: EsqlRunner;
}

/** Fetches one page of rows plus one, sorted by a column. */
export type SortPageFetcher = (args: QueryArgs, ctx: SortPageContext) => Promise<Row[]>;

export interface ColumnQuerySpec {
  /** Sorts by the column; absent when the column can't be sorted. */
  fetchSortPage?: SortPageFetcher;
  /** Fills the column's computed values; absent when the entity doc holds them. */
  enricher?: PageEnricher;
}
