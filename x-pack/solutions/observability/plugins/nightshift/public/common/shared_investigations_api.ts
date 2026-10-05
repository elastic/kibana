/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The shared investigations query API (agenticInvestigations). Spelled out rather than imported,
 * so this plugin does not load the agentic investigations bundle on every page; a test pins them.
 */
export const SHARED_INVESTIGATIONS_URL = '/internal/investigations/investigations';
export const SHARED_INVESTIGATIONS_SEVERITY_COUNTS_URL =
  '/internal/investigations/investigations/_severity_counts';
export const SHARED_INVESTIGATIONS_API_VERSION = '1';

/** The list API reaches at most this many investigations per filter. */
export const MAX_SHARED_INVESTIGATIONS = 1000;
