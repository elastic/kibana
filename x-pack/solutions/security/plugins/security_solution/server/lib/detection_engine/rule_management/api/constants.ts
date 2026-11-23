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

/**
 * Import batch size: route outer chunk (find/validate/KQL) and inner
 * `bulkCreateRules` / `bulkUpdateRules` `batchSize`. Same value so each
 * outer chunk is one alerting bulk request. Leftover chunks still pass
 * this constant, not the leftover count (alerting requires 10–500).
 */
export const RULE_IMPORT_BATCH_SIZE = 200;
