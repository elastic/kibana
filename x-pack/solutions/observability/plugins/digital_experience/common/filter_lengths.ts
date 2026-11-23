/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared by the routes' validation and the app's URL params, so a URL the app accepts never fails
// the route it queries.

/**
 * Longest environment the routes accept, APM's `ignore_above` for `service.environment`; longer
 * ones (kept only by logs-mode OTel indices) could overflow the request header once in the URL.
 */
export const MAX_ENVIRONMENT_LENGTH = 1024;

/** Longest application name the routes accept, APM's `ignore_above` for `service.name`. */
export const MAX_SERVICE_NAME_LENGTH = 1024;

/** Longest mobile release the routes accept, as long as an application name. */
export const MAX_RELEASE_LENGTH = MAX_SERVICE_NAME_LENGTH;

/** Longest mobile `os.name` the routes accept, e.g. `iPadOS`. */
export const MAX_OS_NAME_LENGTH = 64;
