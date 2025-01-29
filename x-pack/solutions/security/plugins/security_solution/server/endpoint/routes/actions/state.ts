/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash/fp';
import type { RequestHandler } from '@kbn/core/server';
import { RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ } from '../../../../common/endpoint/service/response_actions/constants';
import { ACTION_STATE_ROUTE } from '../../../../common/endpoint/constants';
import type {
  SecuritySolutionPluginRouter,
  SecuritySolutionRequestHandlerContext,
} from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers routes for checking state of actions routes
 */
export function registerActionStateRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext,
  canEncrypt?: boolean
) {
  const responseActionAuthzNames = uniq(
    Object.values(RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ)
  );

  router.versioned
    .get({
      access: 'public',
      path: ACTION_STATE_ROUTE,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
      options: { authRequired: true },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      withEndpointAuthz(
        {
          any: responseActionAuthzNames,
        },
        endpointContext.logFactory.get('actionState'),
        getActionStateRequestHandler(canEncrypt)
      )
    );
}

export const getActionStateRequestHandler = function (
  canEncrypt?: boolean
): RequestHandler<unknown, unknown, unknown, SecuritySolutionRequestHandlerContext> {
  return async (_, __, res) => {
    return res.ok({
      body: {
        data: { canEncrypt },
      },
    });
  };
};
