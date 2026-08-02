/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  DeriveConversationIdsRequestQuery,
  type DeriveConversationIdsResponse,
  INTERNAL_API_ACCESS,
  PND_CONVERSATIONS_DERIVE_URL,
  deriveConversationIds,
} from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

import {
  PND_API_PRIVILEGE_READ,
  PND_INCIDENT_AGENT_ID,
  PND_INVESTIGATION_AGENT_ID,
  PND_TUNING_AGENT_ID,
} from '../../../../common/constants';
import { createPndAgentInstaller } from '../../../agent_builder/install_pnd_agents';
import type { RouteDependencies } from '../../register_routes';
import { buildAttackDiscoveryMarkdown } from './helpers/build_attack_discovery_markdown';
import { findAttackDiscoveryAlerts } from './helpers/find_attack_discovery_alerts';
import { truncateAttackDiscoveryTitle } from './helpers/truncate_attack_discovery_title';

/**
 * `GET /internal/pnd/conversations/_derive` — the orchestrator's "prepare conversation context" call.
 *
 * Returns the three deterministic UUIDv5 conversation ids for an Attack Discovery alert, the rendered
 * AD markdown and title that seed and name those conversations, the three per-phase agent ids, and
 * the demo switch. Deriving the ids is a pure function anyone can compute offline, but returning AD
 * content is not: the discovery is resolved **as the calling user** via
 * `GET /api/attack_discovery/_find` and a `404` is returned when the caller cannot read it (security
 * finding S3). The space is taken from the request, never a parameter (S9).
 *
 * Everything here is served from the **one** AD fetch the route already made — no extra requests.
 *
 * It also carries one idempotent side effect: installing the three per-phase PND agents in the
 * request's space, guarded per space in memory. Two consequences worth stating, because they are the
 * reason this shape was chosen:
 *
 * - It runs **after** the S3 check, so a caller who cannot read the discovery never triggers an
 *   install.
 * - The agent ids are returned **only** when the install reports success. That makes agent existence
 *   and agent-id availability succeed or degrade together (ADR-011): a failed install renders
 *   `agent-id` empty in the YAML and the `ai.agent` step falls back to the default agent, rather than
 *   naming an agent that was never ensured and hard-failing the step.
 */
export const registerDeriveConversationIdsRoute = ({
  config,
  getSpaceId,
  getStartServices,
  logger,
  router,
}: RouteDependencies) => {
  // One installer per registration, so its per-space guard lives exactly as long as the routes do.
  const { ensurePndAgents } = createPndAgentInstaller({ logger });

  router.versioned
    .get({
      path: PND_CONVERSATIONS_DERIVE_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Derive the PND conversation ids for an Attack Discovery alert',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(DeriveConversationIdsRequestQuery),
          },
        },
      },
      async (_context, request, response) => {
        const { correlationId } = request.query;

        try {
          const [{ http }, { agentBuilder }] = await getStartServices();
          const spaceId = getSpaceId(request);

          // S3: resolve the discovery as the calling user; 404 when it is not readable.
          const [alert] = await findAttackDiscoveryAlerts({
            http,
            ids: [correlationId],
            request,
            spaceId,
          });

          if (alert == null) {
            return response.notFound();
          }

          const { incidentConversationId, investigationConversationId, tuningConversationId } =
            deriveConversationIds(correlationId);

          const agentsInstalled = await ensurePndAgents({ agentBuilder, spaceId });

          const body: DeriveConversationIdsResponse = {
            attackDiscoveryMarkdown: buildAttackDiscoveryMarkdown(alert),
            attackDiscoveryTitle: truncateAttackDiscoveryTitle(alert.title),
            demoForceIncident: config.demo.forceIncident,
            incidentConversationId,
            investigationConversationId,
            tuningConversationId,
            ...(agentsInstalled
              ? {
                  incidentAgentId: PND_INCIDENT_AGENT_ID,
                  investigationAgentId: PND_INVESTIGATION_AGENT_ID,
                  tuningAgentId: PND_TUNING_AGENT_ID,
                }
              : {}),
          };

          return response.ok({ body });
        } catch (error) {
          logger.error(
            `Failed to derive PND conversation ids for Attack Discovery alert "${correlationId}": ${error}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to derive PND conversation ids' },
          });
        }
      }
    );
};
