/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DocLinksServiceSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { EndpointActionLogRequestSchema } from '../../../../common/api/endpoint';
import { ENDPOINT_ACTION_LOG_ROUTE } from '../../../../common/endpoint/constants';
import { auditLogRequestHandler } from './audit_log_handler';

import type { SecuritySolutionPluginRouter } from '../../../types';
import type { EndpointAppContext } from '../../types';
import { withEndpointAuthz } from '../with_endpoint_authz';

/**
 * Registers the endpoint activity_log route
 * @deprecated
 * @removeBy 9.0.0
 *
 */
export function registerActionAuditLogRoutes(
  router: SecuritySolutionPluginRouter,
  endpointContext: EndpointAppContext,
  docLinks: DocLinksServiceSetup
) {
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ACTION_LOG_ROUTE,
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
        validate: {
          request: EndpointActionLogRequestSchema,
        },
        options: {
          deprecated: {
            documentationUrl:
              docLinks.links.securitySolution.legacyEndpointManagementApiDeprecations,
            severity: 'critical',
            message: i18n.translate(
              'xpack.securitySolution.deprecations.endpoint.response_actions.action_log',
              {
                defaultMessage:
                  'The "{path}" URL is deprecated and will be removed in the next major version.',
                values: { path: ENDPOINT_ACTION_LOG_ROUTE },
              }
            ),
            reason: {
              type: 'remove',
            },
          },
        },
      },
      withEndpointAuthz(
        { all: ['canIsolateHost'] },
        endpointContext.logFactory.get('hostIsolationLogs'),
        auditLogRequestHandler(endpointContext)
      )
    );
}
