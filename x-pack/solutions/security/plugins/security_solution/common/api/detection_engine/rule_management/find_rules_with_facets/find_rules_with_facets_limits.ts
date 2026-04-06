/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Matches OpenAPI `search_term.maxLength` on `_find_granular` and prebuilt `_review` bodies. */
export const MAX_GRANULAR_RULES_SEARCH_TERM_LENGTH = 1000;

/** Soft guard for KQL filter size before parser work; tune with product limits as needed. */
export const MAX_GRANULAR_RULES_FILTER_KQL_LENGTH = 10_000;
