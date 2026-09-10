/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_INVESTIGATIONS_URL,
} from '@kbn/alertzero-common';
import type { ListInvestigationsResponse } from '@kbn/alertzero-common';
import { MOCK_INVESTIGATIONS } from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerListInvestigationsRoute = ({ router, logger, config }: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_INVESTIGATIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] },
      },
      summary: 'List AlertZero investigations',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {},
        },
      },
      async (_context, _request, response) => {
        try {
          if (config.ui.useMockData) {
            const body: ListInvestigationsResponse = {
              investigations: MOCK_INVESTIGATIONS,
              total: MOCK_INVESTIGATIONS.length,
            };
            return response.ok({ body });
          }

          const body: ListInvestigationsResponse = { investigations: [], total: 0 };
          return response.ok({ body });
        } catch (error) {
          logger.error(`Failed to list investigations: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list investigations' },
          });
        }
      }
    );
};
