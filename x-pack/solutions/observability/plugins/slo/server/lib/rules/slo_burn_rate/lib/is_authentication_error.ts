/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

export interface AuthenticationFailure {
  statusCode?: 401 | 403;
  type?: string;
}

const SECURITY_EXCEPTION = 'security_exception';

/**
 * Reads the raw Elasticsearch status and error type, because the saved objects security extension
 * rethrows a rejected credential as a general (500) Boom error that keeps the original 401 fields.
 */
export const getAuthenticationFailure = (err: Error): AuthenticationFailure | undefined => {
  const statusCode = 'statusCode' in err ? err.statusCode : undefined;
  const authStatusCode = statusCode === 401 || statusCode === 403 ? statusCode : undefined;
  const errorType = get(err, 'body.error.type') ?? get(err, 'meta.body.error.type');
  const type = typeof errorType === 'string' ? errorType : undefined;

  if (authStatusCode === undefined && type !== SECURITY_EXCEPTION) {
    return undefined;
  }

  return { statusCode: authStatusCode, type };
};
