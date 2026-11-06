/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';

const isHttpFetchError = (error: Error): error is IHttpFetchError<ResponseErrorBody> =>
  'body' in error;

/**
 * The message a route answered a failed request with. Kibana's HTTP client sets the error's own
 * message to the HTTP status text, such as "Forbidden".
 */
export const httpErrorMessage = (error: Error): string =>
  (isHttpFetchError(error) ? error.body?.message : undefined) || error.message;
