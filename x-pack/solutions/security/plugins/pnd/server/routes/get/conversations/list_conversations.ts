/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ListConversationsRequestQuery,
  type ListConversationsResponse,
  PND_CONVERSATIONS_URL,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import {
  buildAttackDiscoveryWorkflowsSignalHeaders,
  isAttackDiscoveryWorkflowsEnabledForSpace,
} from '../../../lib/attack_discovery_workflows_signal';
import { buildPndConversations } from './helpers/build_pnd_conversations';
import { findAttackDiscoveryAlerts } from './helpers/find_attack_discovery_alerts';
import { listAgentBuilderConversations } from './helpers/list_agent_builder_conversations';
import { paginateConversations } from './helpers/paginate_conversations';

/**
 * `GET /internal/pnd/conversations` — the derived-id conversation list.
 *
 * Derives the expected conversation-id set from the Attack Discovery alerts the caller can read in
 * this space (resolved as the calling user, S3) and intersects it with the caller's Agent Builder
 * conversations (already access-filtered per user by `buildReadAccessFilter`). Each result is typed
 * `investigation` | `incident` | `tuning` | `thread` from the namespace that produced its id — there
 * is no title convention and no stored type field. The space is taken from the request, never a
 * parameter (S9).
 *
 * `kind`, `page` and `perPage` page each chat-page group independently. Omit them to return the
 * full projection — lifecycle and the queue still need every derived conversation in the space.
 */
export const registerListConversationsRoute = ({
  getSpaceId,
  getStartServices,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_CONVERSATIONS_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'List the PND-derived Agent Builder conversations',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(ListConversationsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        try {
          const [{ http }] = await getStartServices();
          const spaceId = getSpaceId(request);

          // AD 2.0 disabled in this space → no derived conversations by design; stamp the signal so
          // the caller can name the setting instead of showing an empty list that reads like a bug.
          const adWorkflowsEnabled = await isAttackDiscoveryWorkflowsEnabledForSpace({
            getStartServices,
            logger,
            request,
            spaceId,
          });
          const headers = buildAttackDiscoveryWorkflowsSignalHeaders(adWorkflowsEnabled);
          if (!adWorkflowsEnabled) {
            return response.ok({ body: { conversations: [], total: 0 }, headers });
          }

          const [alerts, conversations] = await Promise.all([
            findAttackDiscoveryAlerts({ http, request, spaceId }),
            listAgentBuilderConversations({ http, request, spaceId }),
          ]);

          const pndConversations = buildPndConversations({
            correlationIds: alerts.map(({ id }) => id),
            conversations,
          });
          const { kind, page, perPage } = request.query;
          const body: ListConversationsResponse = paginateConversations({
            conversations: pndConversations,
            kind,
            page,
            perPage,
          });

          return response.ok({ body, headers });
        } catch (error) {
          logger.error(`Failed to list PND conversations: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list PND conversations' },
          });
        }
      }
    );
};
