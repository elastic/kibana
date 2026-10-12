/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Time filter for queries with a simple @timestamp range (alerts, anomalies).
 * All values are ES|QL duration strings, e.g. `'48h'`, `'14d'`.
 */
export interface SimpleTimeWindow {
  /** Lower bound inclusive: `@timestamp >= NOW() - from`. */
  from: string;
  /** Upper bound exclusive: `@timestamp < NOW() - to`. Absent = no upper limit (up to NOW()). */
  to?: string;
}

/**
 * Time window for queries that compare two sub-periods of a fetch window
 * (risk movers, newly high/critical). All values are ES|QL duration strings.
 */
export interface ComparisonWindow {
  /** Fetch all docs from `@timestamp >= NOW() - fetchWindow`. */
  fetchWindow: string;
  /** CASE cutoff: docs ≤ NOW() - boundary → "boundary" period; later docs → "current". */
  boundary: string;
  /** Upper bound on @timestamp (exclusive). Absent = no upper limit (current period). */
  upperBound?: string;
}
