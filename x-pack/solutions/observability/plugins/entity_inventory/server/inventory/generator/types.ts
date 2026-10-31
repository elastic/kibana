/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicAttribute } from '@kbn/entity-store/common';

/** The ES|QL source command a plan runs under. */
export type QueryEngine = 'TS' | 'FROM';

/** The index mode of a concrete index, as far as the engine choice is concerned. */
export type IndexMode = 'time_series' | 'standard';

/** One concrete index behind a source's pattern, as the resolver saw it. */
export interface ResolvedIndex {
  name: string;
  mode: IndexMode;
}

/** What the resolver found behind one source's pattern: its readable concrete indices. Empty when the source is unusable. */
export interface ResolvedSource {
  indices: ResolvedIndex[];
}

/** What a list query names after its source command: the source's pattern, or the plan's own indices. */
export type QueryTarget = 'pattern' | 'indices';

/**
 * The unit the generator queries: the indices of one source that share an index mode, with the
 * source's filter and attributes.
 */
export interface QueryPlan {
  /** Position in plan order, 0-based; the stable key for provenance. */
  index: number;
  /** The source of the definition the plan came from. */
  sourceIndex: number;
  indexPattern: string;
  /** The concrete indices the plan covers, sorted. */
  indices: string[];
  /** `pattern` when the plan covers every index of its source, `indices` when the source was split by mode. */
  queryTarget: QueryTarget;
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
