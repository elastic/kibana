/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maximum number of indices accepted by the log analysis validation APIs.
 */
export const MAX_VALIDATION_INDICES = 1000;

/**
 * Maximum number of fields accepted by the log analysis validation APIs.
 */
export const MAX_VALIDATION_FIELDS = 100;

/**
 * Bound on the number of concurrent backend queries fanned out per validation request.
 */
export const MAX_CONCURRENT_INDEX_QUERIES = 10;
