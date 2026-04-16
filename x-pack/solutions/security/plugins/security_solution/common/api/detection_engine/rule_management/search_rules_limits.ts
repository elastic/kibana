/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Max length of the free-text `search.term` field on granular rules list APIs. */
export const MAX_SEARCH_RULES_SEARCH_TERM_LENGTH = 1000;

/** Max length of the KQL `filter` string on granular rules list APIs. */
export const MAX_SEARCH_RULES_FILTER_KQL_LENGTH = 10_000;
