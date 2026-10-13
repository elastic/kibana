/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** How often to poll the server (status + result data) while a significant events pipeline is running. */
export const RUNNING_POLL_INTERVAL_MS = 5 * 1000;

/**
 * How long to keep polling a created or edited source for its onboarding run. The server starts
 * the run asynchronously (source-change workflow, with retries while a previous write finishes),
 * so the first status read usually still shows no run.
 */
export const ONBOARDING_START_GRACE_MS = 60 * 1000;
