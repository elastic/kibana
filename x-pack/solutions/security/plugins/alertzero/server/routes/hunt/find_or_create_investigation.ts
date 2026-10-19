/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FindOrCreateInvestigationResponse } from '@kbn/alertzero-common';
import {
  API_VERSIONS,
  FindOrCreateInvestigationRequestBody,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  ALERTZERO_API_PRIVILEGE_WRITE,
  FIND_OR_CREATE_INVESTIGATION_URL,
} from '../../../common/constants';
import { loadReportHuntContext } from '../../services/watches/hunt/common/load_report_context';
import { runFindOrCreateInvestigation } from '../../services/watches/hunt/common/find_or_create_investigation';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

export { FIND_OR_CREATE_INVESTIGATION_URL };

/**
 * Mints or verifies the Hunt Watch Investigation for a report. Internal user for the
 * report read: `.kibana-threat-reports` is plugin-owned and hidden, and Kibana feature
 * privileges grant no Elasticsearch privileges on it, the same rule the hunt coordinator
 * route follows for its own reports client.
 */
export const registerFindOrCreateInvestigationRoute = ({
  router,
  logger,
  getSpaceId,
  getAgentBuilderConversations,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: FIND_OR_CREATE_INVESTIGATION_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_WRITE],
        },
      },
      summary: 'Find or create a Hunt Watch Investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(FindOrCreateInvestigationRequestBody),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const core = await context.core;
          const spaceId = getSpaceId(request);
          const reportsEsClient = core.elasticsearch.client.asInternalUser;
          const conversations = getAgentBuilderConversations();
          const conversationClient = await conversations.getScopedClient({ request });

          const { reportId } = request.body;

          const output = await runFindOrCreateInvestigation(
            { spaceId, reportId },
            {
              conversationClient,
              loadReport: () =>
                loadReportHuntContext({ esClient: reportsEsClient, spaceId, reportId }),
              logger,
            }
          );

          const body: FindOrCreateInvestigationResponse = output;
          return response.ok({ body });
        } catch (err) {
          logger.error(`find_or_create_investigation route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Find-or-create Investigation failed' },
          });
        }
      })
    );
};
