/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Event merging banner is hidden temporarily for 8.16 (and serverless).
 * Probably will be enabled for 8.17 or 8.18, when we can change the defaults and trigger policy deploy by migration.
 * Blocker issue: https://github.com/elastic/kibana/issues/193352
 */
export const ALLOW_SHOWING_EVENT_MERGING_BANNER = false;

/**
 * The version from which we decrease event volume by default.
 */
export const ENDPOINT_VERSION_SUPPORTING_EVENT_MERGING_BY_DEFAULT = '8.17';
