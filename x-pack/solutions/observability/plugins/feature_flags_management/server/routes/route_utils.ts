/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, KibanaResponseFactory, RouteSecurity } from '@kbn/core/server';
import { API_OAS_TAG, API_PRIVILEGES } from '../../common/constants';
import { FeatureFlagsError } from '../errors';

export const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [API_PRIVILEGES.read] },
};

export const MANAGE_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [API_PRIVILEGES.manage] },
};

export const ROUTE_OPTIONS = {
  tags: [API_OAS_TAG],
  availability: { stability: 'experimental' as const },
};

/** Documented in OAS; the bodies are Kibana's standard error shape. */
export const ERROR_RESPONSES = {
  validation: {
    400: { description: 'The request is invalid. `attributes.issues` lists each problem.' },
  },
  notFound: { 404: { description: 'The object does not exist.' } },
  conflict: {
    409: {
      description:
        'The object already exists, was changed since `version` was read, or is still referenced.',
    },
  },
};

/** Maps domain errors to HTTP responses; anything else becomes a 500. */
export const handleErrors = async (
  response: KibanaResponseFactory,
  handler: () => Promise<IKibanaResponse>
): Promise<IKibanaResponse> => {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof FeatureFlagsError) {
      return response.customError({
        statusCode: error.statusCode,
        body: {
          message: error.message,
          ...(error.issues?.length ? { attributes: { issues: error.issues } } : {}),
        },
      });
    }
    throw error;
  }
};
