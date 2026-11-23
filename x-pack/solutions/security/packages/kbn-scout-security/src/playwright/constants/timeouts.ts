/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** First Security app load waits for user-info / lists init and the ad-hoc data view. */
export const APP_LOAD_TIMEOUT_MS = 60_000;

/** Timeout for async data fetches after the app has already mounted (e.g. MITRE API, matrix query). */
export const DATA_LOAD_TIMEOUT_MS = 30_000;
