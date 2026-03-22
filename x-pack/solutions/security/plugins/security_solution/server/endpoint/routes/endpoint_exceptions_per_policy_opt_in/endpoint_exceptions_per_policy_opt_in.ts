/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReservedPrivilegesSet, type RequestHandler } from '@kbn/core/server';
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

export const getOptInToPerPolicyEndpointExceptionsHandler = (
  endpointAppServices: EndpointAppContextService
): RequestHandler<undefined, undefined, undefined, SecuritySolutionRequestHandlerContext> => {
  const logger = endpointAppServices.createLogger('endpointExceptionsPerPolicyOptInHandler');

  return async (context, req, res) => {
    try {
      const referenceDataClient = endpointAppServices.getReferenceDataClient();

      const currentOptInStatus = await referenceDataClient.get<OptInStatusMetadata>(
        REF_DATA_KEYS.endpointExceptionsPerPolicyOptInStatus
      );

      currentOptInStatus.metadata.status = true;

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

export const registerEndpointExceptionsPerPolicyOptInRoute = (
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext
) => {
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
      getOptInToPerPolicyEndpointExceptionsHandler(endpointContext.service)
    );
};
