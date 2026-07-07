/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * 1 hour = 3600000 ms = 60 minutes * 60 seconds * 1000 ms
 */
export const RULE_MANAGEMENT_BULK_ACTION_SOCKET_TIMEOUT_MS = 3600000 as const;
/**
 * 1 hour = 3600000 ms = 60 minutes * 60 seconds * 1000 ms
 */
export const RULE_MANAGEMENT_IMPORT_EXPORT_SOCKET_TIMEOUT_MS = 3600000 as const;

/** Batch size for the legacy per-rule import loop; also bounds overwrite-branch concurrency. */
export const RULE_MANAGEMENT_IMPORT_BATCH_SIZE = 50;

/** Bulk import batch size; optmised for performance and memory usage. */
export const RULE_MANAGEMENT_BULK_IMPORT_BATCH_SIZE = 200;
