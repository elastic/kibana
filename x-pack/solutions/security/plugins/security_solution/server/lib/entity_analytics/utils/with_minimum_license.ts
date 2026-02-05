/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, RouteMethod } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { LicenseType } from '@kbn/licensing-types';
import type { SecuritySolutionRequestHandlerContext } from '../../../types';

const LICENSE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.api.licenseError',
  {
    defaultMessage: 'Your license does not support this feature.',
  }
);

/**
 * Wraps a request handler with a check for the license. If the license is not valid, it will
 * return a 403 error with a message.
 */
export const withMinimumLicense = <
  P = unknown,
  Q = unknown,
  B = unknown,
  Method extends RouteMethod = never
>(
  handler: RequestHandler<P, Q, B, SecuritySolutionRequestHandlerContext, Method>,
  minimumLicenseRequired: LicenseType = 'enterprise'
): RequestHandler<P, Q, B, SecuritySolutionRequestHandlerContext, Method> => {
  return async (context, req, res) => {
    const { license } = await context.licensing;
    if (!license.hasAtLeast(minimumLicenseRequired)) {
      return res.forbidden({ body: LICENSE_ERROR_MESSAGE });
    }
    return handler(context, req, res);
  };
};
