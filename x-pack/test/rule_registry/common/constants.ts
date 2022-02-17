/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const APM_METRIC_INDEX_NAME = 'apm-8.0.0-transaction';
export const MAX_POLLS = 10;
export const BULK_INDEX_DELAY = 1000;
export const INDEXING_DELAY = 5000;
export const ALERTS_TARGET_INDICES_URL =
  '/api/observability/rules/alerts/dynamic_index_pattern?namespace=default&registrationContexts=observability.apm&registrationContexts=';
