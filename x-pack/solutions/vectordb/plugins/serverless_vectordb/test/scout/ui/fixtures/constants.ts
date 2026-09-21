/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `gotoApp` targets, expressed the way Kibana routes them: the wizard steps are React Router
 * paths under the single `vectordb` application.
 */
export const VECTORDB_APP = 'vectordb';
export const PATH_SELECTION_APP = 'vectordb/getting_started';
export const INGEST_STEP_APP = 'vectordb/getting_started/ingest';
export const SEARCH_STEP_APP = 'vectordb/getting_started/search';

export const DEPLOYMENT_STATS_API_PATH = '/internal/serverless_vectordb/deployment_stats';

/** Mirrors `ONBOARDING_SEEN_STORAGE_KEY` in `@kbn/vectordb-onboarding`. */
export const ONBOARDING_SEEN_STORAGE_KEY = 'vectordb.onboarding.completed';
