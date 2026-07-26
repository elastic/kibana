/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * localStorage key checked by `hasSeenOnboarding()` in `@kbn/vectordb-onboarding`
 * (`src/storage_keys.ts`, not exported from the package entry point). When unset,
 * `/app/vectordb` redirects to the onboarding landing page and chrome is hidden.
 */
export const ONBOARDING_SEEN_STORAGE_KEY = 'serverless.onboarding.completed';

/**
 * Budget for chrome nav and app shells on serverless — primary nav and lazily
 * mounted app roots can lag behind Playwright defaults (see gh-267186).
 */
export const VECTORDB_SPA_SHELL_TIMEOUT_MS = 45_000;
