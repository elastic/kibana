/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  ALERTZERO_THIN_AGENT_ID,
  ALERTZERO_INVESTIGATIONS_COUNT_URL,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

export const registerGetInvestigationsCountRoute = ({
  router,
  getAgentBuilderConversations,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: ALERTZERO_INVESTIGATIONS_COUNT_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Count AlertZero investigations',
      description:
        'Returns the number of conversations belonging to the AlertZero thin agent in the current space.',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (context, request, response) => {
        try {
          const conversations = getAgentBuilderConversations();
          const client = await conversations.getScopedClient({ request });
          const { total } = await client.list({
            agentId: ALERTZERO_THIN_AGENT_ID,
            perPage: 1,
          });
          return response.ok({ body: { total } });
        } catch (err) {
          return response.customError({
            statusCode: 500,
            body: { message: err instanceof Error ? err.message : String(err) },
          });
        }
      }
    );
};
