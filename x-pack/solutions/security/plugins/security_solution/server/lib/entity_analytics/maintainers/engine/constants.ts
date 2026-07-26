/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOOKBACK_WINDOW = 'now-30d';
/** Numeric equivalent of LOOKBACK_WINDOW for JS Date arithmetic (e.g. computing sliceStart). */
export const LOOKBACK_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const COMPOSITE_PAGE_SIZE = 3500;
export const MAX_ITERATIONS = 1000;
/** Sampling probability for the actor slice probe query. Reads ~10% of docs to find the slice boundary cheaply. */
export const SLICE_SAMPLE_PROBABILITY = 0.1;
/** Timeout for the extract query (Step 3). The default ES|QL timeout is 30s, which is too short for large indices. */
export const EXTRACT_QUERY_TIMEOUT_MS = 60_000;

/**
 * Required ES|QL preamble for every Step 2 query the engine runs.
 *
 * `SET unmapped_fields="nullify"` makes ES|QL treat references to fields that
 * are absent from the index mapping as `NULL` instead of failing the query.
 * The default builder relies on this for `IS NOT NULL` / `COALESCE` checks
 * over fields that vary across integrations (e.g. azure_auditlogs sub-fields
 * that other integrations don't have).
 *
 * The engine prepends this verbatim to every query — including
 * `kind: 'override'` configs — so override authors can't forget it. Override
 * functions MUST NOT emit their own `SET unmapped_fields=...` line; the
 * engine adds it. (A second `SET` would be redundant and could confuse
 * future readers about which value is in effect.)
 */
export const ESQL_ENGINE_PREAMBLE = 'SET unmapped_fields="nullify";';
