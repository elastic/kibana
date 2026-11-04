/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicAttribute } from '@kbn/entity-store/common';

/** The ES|QL source command a plan runs under. */
export type QueryEngine = 'TS' | 'FROM';

/** The unit the generator queries: one per source for now, each with its own filter and attributes. */
export interface QueryPlan {
  /** Position in plan order, 0-based; the stable key for provenance. */
  index: number;
  /** The source of the definition the plan came from. */
  sourceIndex: number;
  indexPattern: string;
  /** The plan's ES|QL filter; for now the source's own. */
  filter?: string;
  /** The source's attributes; every plan of a source carries them. */
  attributes: DynamicAttribute[];
  engine: QueryEngine;
}

/** The query window as ISO 8601 bounds, `[from, to)`. */
export interface TimeWindow {
  from: string;
  to: string;
}

/** Named ES|QL parameters in the request-body shape. */
export type NamedParams = Array<Record<string, string | number | boolean>>;

/** ES|QL text with the named parameters it references. */
export interface GeneratedQuery {
  esql: string;
  params: NamedParams;
}

/** The most plans a definition may expand to, since each plan is a concurrent query. */
export const MAX_QUERY_PLANS = 32;
