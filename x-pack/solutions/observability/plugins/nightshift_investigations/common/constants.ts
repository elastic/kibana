/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Leaf module: server task code imports these without loading the whole `common` barrel.

export const NIGHTSHIFT_INVESTIGATION_AGENT_ID = 'nightshift.investigation';

/** Answers one telemetry question from the sandbox without running an investigation. */
export const NIGHTSHIFT_ASSISTANT_AGENT_ID = 'nightshift.assistant';

/** Bound for investigation ids, concurrency keys, and other keyword-sized strings. */
export const MAX_KEYWORD_LENGTH = 500;
