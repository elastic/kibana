/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  GetConversationAttachmentsRequestParams,
  GetConversationAttachmentsRequestQuery,
  type GetConversationAttachmentsResponse,
  INTERNAL_API_ACCESS,
  PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import { PND_API_PRIVILEGE_READ } from '../../../../common/constants';
import type { RouteDependencies } from '../../register_routes';
import { findAttackDiscoveryAlerts } from '../conversations/helpers/find_attack_discovery_alerts';
import { listAgentBuilderAttachments } from '../../helpers/list_agent_builder_attachments';
import { guardDerivedConversationId } from '../../helpers/guard_derived_conversation_id';
import { projectAgentBuilderAttachments } from './helpers/project_agent_builder_attachments';

/**
 * `GET /internal/pnd/conversations/{conversationId}/attachments` — list one PND conversation's
 * attachments as the caller (D10).
 *
 * A **proxy over Agent Builder's public attachments API**, not a reimplementation of it. Attachments
 * are already a first-class Agent Builder concept: `GET|POST|PUT|DELETE` on
 * `/api/agent_builder/conversations/{id}/attachments` are `access: 'public'` and every handler
 * `client.get`s the conversation first, so **zero platform change** is required and access control
 * is inherited rather than re-implemented. PND creates three `type: 'text'` attachments when
 * `_ensure` materialises a thread; this is what lists them back for the lifecycle flyout's
 * Attachments tab.
 *
 * **Three boundaries, in order, and the order is the point:**
 *
 * 1. `pnd_read` — the platform authz grant. This is a read, so it takes the low privilege.
 * 2. Security finding **S11**: `conversationId` must be one of the seven ids derived from
 *    `correlationId`, so this route can never become a generic Agent Builder attachment
 *    reader. It runs first because it is pure and needs no I/O.
 * 3. Security finding **S3**: the discovery is resolved **as the calling user**, and an unreadable
 *    one is a `404` — the guard proves the id is PND-owned, never that this caller may see the
 *    discovery it belongs to.
 *
 * **Every refusal is a `404`, never a `403`**, the posture `_ensure` set and the one Agent Builder
 * itself takes. Below all three boundaries, Agent Builder answers `404` for a conversation that
 * exists but the caller may not read, and this route forwards that unchanged.
 *
 * ⚠️ **Deliberate asymmetry, recorded as a known limitation.** The PND agents keep `NO_TOOLS` this
 * round (D3), so these attachments are visible to the **analyst** through this route but are not
 * readable by the **agent**. Granting `attachment_list` / `attachment_read` / `attachment_diff` is a
 * follow-up, not an oversight.
 */
export const registerGetConversationAttachmentsRoute = ({
  getSpaceId,
  getStartServices,
  logger,
  router,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get one PND conversation\u2019s attachments',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(GetConversationAttachmentsRequestParams),
            query: buildRouteValidationWithZod(GetConversationAttachmentsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        const { conversationId } = request.params;
        const { correlationId } = request.query;

        const guarded = guardDerivedConversationId({
          correlationId,
          conversationId,
          logger,
        });

        if (!guarded.authorized) {
          return response.notFound();
        }

        try {
          const [{ http }] = await getStartServices();
          const spaceId = getSpaceId(request);

          // S3: resolve the discovery as the calling user; 404 when it is not readable.
          const [alert] = await findAttackDiscoveryAlerts({
            http,
            ids: [correlationId],
            request,
            spaceId,
          });

          if (alert == null) {
            logger.warn(
              `Refusing to list attachments of PND conversation "${conversationId}": Attack Discovery alert "${correlationId}" is not readable in space "${spaceId}".`
            );
            return response.notFound();
          }

          const { attachments, exists } = await listAgentBuilderAttachments({
            conversationId,
            http,
            request,
            spaceId,
          });

          if (!exists) {
            return response.notFound();
          }

          const body: GetConversationAttachmentsResponse = {
            attachments: projectAgentBuilderAttachments(attachments ?? []),
            // The true count, so a list capped at the contract's `maxItems` is visible to the
            // client as `total > attachments.length` rather than silently short.
            total: attachments?.length ?? 0,
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(
            `Failed to list attachments of PND conversation "${conversationId}" for Attack Discovery alert "${correlationId}": ${
              error instanceof Error ? error.message : String(error)
            }`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list the PND conversation attachments' },
          });
        }
      }
    );
};
