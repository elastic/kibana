/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ONBOARDING_SEEN_STORAGE_KEY = 'serverless.onboarding.completed';

// Persists across sessions so that a new API key is only created once per browser.
export const ONBOARDING_API_KEY_STORAGE_KEY = 'vectordb.onboarding.apiKey';

export const TUTORIAL_PROGRESS_STORAGE_KEY = 'serverless.onboarding.tutorials.completed';
export const TUTORIAL_PROGRESS_EVENT = 'serverless-onboarding-tutorials-changed';
