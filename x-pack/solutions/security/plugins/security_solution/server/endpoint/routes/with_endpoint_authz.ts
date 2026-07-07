/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler, KibanaRequest, Logger } from '@kbn/core/server';
import { errorHandler } from './error_handler';
import { stringify } from '../utils/stringify';
import type { EndpointAuthzKeyList } from '../../../common/endpoint/types/authz';
import type { SecuritySolutionRequestHandlerContext } from '../../types';
import { EndpointAuthorizationError } from '../errors';

/**
 * Interface for defining the needed permissions to access an API. Both sets of permissions (if defined) will
 * be `AND` together.
 */
export interface EndpointApiNeededAuthz {
  /* A list of authorization keys that ALL needed to be allowed */
  all?: EndpointAuthzKeyList;

  /* A list of authorization keys where at least one must be allowed */
  any?: EndpointAuthzKeyList;
}

/**
 * Wraps an API route handler and handles authorization checks for endpoint related
 * apis.
 * @param neededAuthz
 * @param routeHandler
 * @param logger
 * @param additionalChecks
 */
export const withEndpointAuthz = <T>(
  neededAuthz: EndpointApiNeededAuthz,
  logger: Logger,
  routeHandler: T,
  additionalChecks?: (
    context: SecuritySolutionRequestHandlerContext,
    request: KibanaRequest
  ) => void | Promise<void>
): T => {
  const needAll: EndpointAuthzKeyList = neededAuthz.all ?? [];
  const needAny: EndpointAuthzKeyList = neededAuthz.any ?? [];
  const validateAll = needAll.length > 0;
  const validateAny = needAny.length > 0;
  const enforceAuthz = validateAll || validateAny;
  const logAuthzFailure = (
    user: string,
    authzValidationResults: Record<string, boolean>,
    needed: string[]
  ) => {
    logger.debug(
      `Unauthorized: user ${user} ${
        needed === needAll ? 'needs ALL' : 'needs at least one'
      } of the following privileges:\n${stringify(needed)}\nbut is missing: ${stringify(
        Object.entries(authzValidationResults)
          .filter(([_, value]) => !value)
          .map(([key]) => key)
      )}`
    );
  };

  if (!enforceAuthz) {
    logger.warn(`Authorization disabled for API route: ${new Error('').stack ?? '?'}`);
  }

  const handlerWrapper: RequestHandler<
    unknown,
    unknown,
    unknown,
    SecuritySolutionRequestHandlerContext
  > = async (context, request, response) => {
    if (enforceAuthz) {
      const coreServices = await context.core;
      const endpointAuthz = await (await context.securitySolution).getEndpointAuthz();
      let authzValidationResults: Record<string, boolean> = {};
      const permissionChecker = (permission: EndpointAuthzKeyList[0]) => {
        authzValidationResults[permission] = endpointAuthz[permission];
        return endpointAuthz[permission];
      };

      // has `all`?
      if (validateAll && !needAll.every(permissionChecker)) {
        logAuthzFailure(
          coreServices.security.authc.getCurrentUser()?.username ?? '',
          authzValidationResults,
          needAll
        );

        return response.forbidden({
          body: new EndpointAuthorizationError({ need_all: [...needAll] }),
        });
      }

      authzValidationResults = {};

      // has `any`?
      if (validateAny && !needAny.some(permissionChecker)) {
        logAuthzFailure(
          coreServices.security.authc.getCurrentUser()?.username ?? '',
          authzValidationResults,
          needAny
        );

        return response.forbidden({
          body: new EndpointAuthorizationError({ need_any: [...needAny] }),
        });
      }
    }

    if (additionalChecks) {
      try {
        await additionalChecks(context, request);
      } catch (err) {
        logger.debug(() => stringify(err));

        return errorHandler(logger, response, err);
      }
    }

    // Authz is good call the route handler
    return (routeHandler as unknown as RequestHandler)(context, request, response);
  };

  return handlerWrapper as unknown as T;
};
