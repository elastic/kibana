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
 * Default import batch size: outer chunk (find/validate/KQL) and inner
 * `bulkCreateRules` `batchSize`. Same value so each outer batch is one
 * alerting bulk request.
 */
export const RULE_IMPORT_BULK_CREATE_BATCH_SIZE = 200;

/**
 * `pMap` concurrency for the per-rule overwrite branch during import
 * (existing `rule_id`s are updated one-by-one via `rulesClient.update`).
 */
export const RULE_IMPORT_BULK_UPDATE_CONCURRENCY = 50;
