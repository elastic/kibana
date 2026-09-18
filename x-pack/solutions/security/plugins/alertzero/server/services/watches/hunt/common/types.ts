/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Technologies the MVP resolves an index scope for. Extend this union only
 * alongside a corresponding entry in `TECHNOLOGY_INDEX_MAP`
 * (`resolve_index_scope.ts`) — the two are kept in lockstep intentionally
 * rather than derived from each other, so a missing mapping is a type error.
 *
 * MVP scope is AWS IAM and FortiGate only (buildout.md:175, research.md:25).
 * Other technologies mustard's flat allow-list touched (Endpoint,
 * Vulnerability, Okta, Kubernetes, GitHub, Network Traffic) are out of scope
 * until a report actually needs them — see open-questions.md #4.
 */
export type HuntTechnology = 'aws_iam' | 'fortigate';

/**
 * Readiness verdict for a technology's index scope in a given space.
 *
 * - `ok`: every required and optional pattern resolved to at least one
 *   concrete, available index/data stream.
 * - `degraded`: every required pattern resolved but at least one optional
 *   pattern did not; the hunt can still run with reduced coverage.
 * - `blocked`: at least one required pattern resolved to nothing; the hunt
 *   has a gap in what it must search and must not run (plan.md:247: a
 *   missing index must never read as clean).
 */
export type IndexScopeStatus = 'ok' | 'degraded' | 'blocked';

export interface IndexScopeWindow {
  /** ISO 8601 start of the search window, inclusive. */
  from: string;
  /** ISO 8601 end of the search window, exclusive. */
  to: string;
}

/**
 * A2's output contract (plan.md:245): `{ required, optional, missing,
 * status, window, rowLimit }`. `required`/`optional` list every pattern that
 * was *checked* for the technology (present or not); `missing` lists every
 * pattern from either list that resolved to zero indices, so absence is
 * reported rather than silently dropped (plan.md:247).
 */
export interface ResolvedIndexScope {
  technology: HuntTechnology;
  status: IndexScopeStatus;
  /** Every required pattern checked for this technology. */
  required: string[];
  /** Every optional pattern checked for this technology, including the space-derived alerts pattern. */
  optional: string[];
  /** Patterns (required or optional) that resolved to zero indices/data streams. */
  missing: string[];
  window: IndexScopeWindow;
  rowLimit: number;
}
