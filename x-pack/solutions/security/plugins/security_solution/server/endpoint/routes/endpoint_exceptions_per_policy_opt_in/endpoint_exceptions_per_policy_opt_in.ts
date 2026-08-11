/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet, type RequestHandler } from '@kbn/core/server';
import type { GetEndpointExceptionsPerPolicyOptInResponse } from '../../../../common/api/endpoint/endpoint_exceptions_per_policy_opt_in/endpoint_exceptions_per_policy_opt_in.gen';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE } from '../../../../common/endpoint/constants';
import type { EndpointAppContextService } from '../../endpoint_app_context_services';
import { errorHandler } from '../error_handler';
import type { OptInStatusMetadata } from '../../lib/reference_data';
import { REF_DATA_KEYS } from '../../lib/reference_data';
import { withEndpointAuthz } from '../with_endpoint_authz';

export const getOptInToPerPolicyEndpointExceptionsPOSTHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<never, never, never, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointAppServices.createLogger('endpointExceptionsPerPolicyOptInHandler');

  return async (context, req, res) => {
    try {
      const coreContext = await context.core;
      const user = coreContext.security.authc.getCurrentUser();
      const referenceDataClient = endpointAppServices.getReferenceDataClient();

      const currentOptInStatus = await referenceDataClient.get<OptInStatusMetadata>(
        REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
      );

      currentOptInStatus.metadata = {
        status: true,
        reason: 'userOptedIn',
        user: user?.username ?? 'unknown',
        timestamp: new Date().toISOString(),
      };

      await referenceDataClient.update<OptInStatusMetadata>(
        REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus,
        currentOptInStatus
      );

      logger.info('Endpoint Exceptions per policy opt-in successful');

      return res.ok();
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
};

export const getOptInToPerPolicyEndpointExceptionsGETHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<never, never, never, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointAppServices.createLogger('endpointExceptionsPerPolicyOptInHandler');

  return async (context, req, res) => {
    try {
      const referenceDataClient = endpointAppServices.getReferenceDataClient();

      const currentOptInStatus = await referenceDataClient.get<OptInStatusMetadata>(
        REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
      );

      const body: GetEndpointExceptionsPerPolicyOptInResponse = {
        status: currentOptInStatus.metadata.status,
        reason: currentOptInStatus.metadata.reason,
      };

      return res.ok({ body });
    } catch (err) {
      return errorHandler(logger, res, err);
    }
  };
};

export const registerEndpointExceptionsPerPolicyOptInRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
  const logger = endpointContext.logFactory.get('endpointExceptionsPerPolicyOptInHandler');

  router.versioned
    .post({
      access: 'internal',
      path: ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
      security: {
        authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      // todo: would be better to add `canWriteAdminData` to `withEndpointAuthz`, instead of
      // using the ReservedPrivilegesSet.superuser above,
      // so we have a single source of truth regarding authz, but the role names in the serverless API test
      // are not passed through the authz service, which makes the test fail, so for now rather have the test pass.
      withEndpointAuthz(
        // hiding behind Platinum+ license
        { all: ['canCreateArtifactsByPolicy'] },
        logger,
        getOptInToPerPolicyEndpointExceptionsPOSTHandler(endpointContext.service)
      )
    );

  router.versioned
    .get({
      access: 'internal',
      path: ENDPOINT_EXCEPTIONS_PER_POLICY_OPT_IN_ROUTE,
      security: {
        authz: { requiredPrivileges: ['securitySolution'] },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {},
      },
      withEndpointAuthz(
        { all: ['canReadEndpointExceptions'] },
        logger,
        getOptInToPerPolicyEndpointExceptionsGETHandler(endpointContext.service)
      )
    );
};
