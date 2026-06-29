/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Default timeout for the generation route handler in milliseconds.
 * This controls how long the HTTP route can remain open before timing out.
 * Default: 10 minutes
 */
export const DEFAULT_ROUTE_HANDLER_TIMEOUT_MS = 10 * 60 * 1000;
