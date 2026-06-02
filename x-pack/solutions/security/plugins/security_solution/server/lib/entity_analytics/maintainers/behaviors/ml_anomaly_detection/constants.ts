/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_AD_MAINTAINER_ID = 'ml-anomaly-detection-jobs';
export const ML_AD_MAINTAINER_INTERVAL = '1d';
export const ML_AD_MAINTAINER_TIMEOUT = '10m';

export const ML_AD_JOB_ENTITY_TYPES = ['user', 'host'] as const;

// Window of anomaly records to inspect each run.
export const ML_AD_LOOKBACK = '30d';

// Safety check to prevent infinite loops in maintainer run
export const MAX_ALLOWED_ITERS = 10000;

// Page size when iterating entities from the entity store.
export const ENTITY_PAGE_SIZE = 200;

// Page size for paginating anomaly search results.
export const ANOMALY_SEARCH_PAGE_SIZE = 1000;

export const ML_AD_DETAILS_INDEX_BASE = '.entity_analytics.ml-ad-jobs-latest';

export const getMlAdDetailsIndexName = (namespace: string): string =>
  `${ML_AD_DETAILS_INDEX_BASE}-${namespace}`;
