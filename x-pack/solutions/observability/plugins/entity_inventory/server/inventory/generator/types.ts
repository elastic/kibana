/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicAttribute } from '@kbn/entity-store/common';

/** The ES|QL source command a plan runs under. */
export type QueryEngine = 'TS' | 'FROM';

/** What the probe found behind one source's pattern. */
export interface SourceProbe {
  /** Whether a readable time-series index exists behind the source's pattern. */
  hasTimeSeries: boolean;
}

/**
 * The unit the generator queries: one source under one engine, with the source's filter and
 * attributes. Both plans of a source name the pattern exactly as the author wrote it.
 */
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
  /** `TS` reads the pattern's time-series indices, `FROM` every other index behind it. */
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
