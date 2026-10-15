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
  /** Runs an ES|QL query and returns its rows. */
  runQuery: EsqlRunner;
  http: HttpSetup;
  signal?: AbortSignal;
}

/** Fields an enricher fetched, per entity id. */
export type EnrichedFields = ReadonlyMap<string, Row>;

export interface PageEnricher {
  /** The row fields it sets. It is skipped when the sort query already read them. */
  fields: readonly string[];
  /** Fetches those fields for the page rows, per entity id. Rejects when its query fails. */
  fetch: (rows: readonly Row[], args: QueryArgs, ctx: RunContext) => Promise<EnrichedFields>;
}

export interface SortPageContext {
  /** Runs an ES|QL query and returns its rows. */
  runQuery: EsqlRunner;
  /** Number of entities in view, from the cached count query. Only large-view plans ask. */
  fetchViewSize: () => Promise<number>;
}

/** Fetches one page of rows plus one, sorted by a column. */
export type SortPageFetcher = (args: QueryArgs, ctx: SortPageContext) => Promise<Row[]>;

export interface ColumnQuerySpec {
  /** Sorts by the column; absent when the column can't be sorted. */
  fetchSortPage?: SortPageFetcher;
  /** Fills the column's computed values; absent when the entity doc holds them. */
  enricher?: PageEnricher;
}
