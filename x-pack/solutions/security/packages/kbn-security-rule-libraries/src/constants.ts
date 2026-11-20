/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_LIBRARY_SO_TYPE = 'security-rule-library';
export const PREBUILT_RULE_SO_TYPE = 'security-rule';
export const ELASTIC_LIBRARY_ID = 'elastic';
export const COMMUNITY_LIBRARY_ID = 'elastic-community';
export const BATCH_SIZE = 100;
// Largest response a scan accepts when listing the files of a release, enough for tens of thousands of rules.
export const SCAN_MAX_RESPONSE_BYTES = 32 * 1024 * 1024;
// Most S3 list pages a scan reads. At 1,000 keys a page this is 200,000 objects.
export const SCAN_MAX_LIST_PAGES = 200;
export const REFRESH_LOCK_TIMEOUT_MS = 30 * 60 * 1000;
