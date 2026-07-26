/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOOKBACK_WINDOW = 'now-30d';
export const COMPOSITE_PAGE_SIZE = 3500;
export const MAX_ITERATIONS = 1000;

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
