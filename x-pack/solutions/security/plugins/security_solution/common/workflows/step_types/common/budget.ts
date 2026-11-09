/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_TOOL_RESULT_TOKENS = 20_000;

export const WRAPPER_MARGIN_TOKENS = 4_000;

export const ENVELOPE_TOKEN_BUDGET = MAX_TOOL_RESULT_TOKENS - WRAPPER_MARGIN_TOKENS;

export const ELLIPSIS = '…';
export const EXCERPT_MAX_CHARS = 300;
export const MAX_INPUT_STRING_CHARS = 256;
export const MAX_ITEM_IDS = 50;
export const MAX_QUERY_CHARS = 1_024;
export const MAX_FIND_LIMIT = 100;
export const DEFAULT_FIND_LIMIT = 20;
export const MAX_KNOWLEDGE_RESULTS = 10;
export const DEFAULT_KNOWLEDGE_RESULTS = 5;
export const FETCH_CAP_MAX = 2_000;
export const FETCH_CAP_DEFAULT = FETCH_CAP_MAX;
