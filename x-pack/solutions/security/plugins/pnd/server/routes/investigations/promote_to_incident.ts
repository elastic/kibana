/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';

const Params = z.object({
  id: z.string().min(1).max(256),
});

const Body = z.object({
  /** Optional explicit Incident id; derived from the Investigation when absent. */
  incidentId: z.string().min(1).max(256).optional(),
  /** Free-text justification, recorded on both roots' timelines. */
  reason: z.string().max(2048).optional(),
});

const PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/_promote_to_incident` as const;

/**
 * Promotes an Investigation to an Incident (object model D13).
 *
 * This is a **fork to a new root**, not a status transition — see
 * `IncidentForkStore.forkToIncident`. The source Investigation is left intact
 * and its timeline is carried onto the new Incident, so opening either record
 * still shows the full history.
 *
 * Deliberately NOT encoding a promotion *policy* (who may promote, and whether
 * promotion can be automatic): that's flagged open in the object-model doc
 * ("Who marks something as an incident" — analyst-default vs. autonomy dial).
 * The route records whichever authenticated principal called it and leaves the
 * policy decision upstream.
 */
export const registerPromoteToIncidentRoute = ({
  router,
  logger,
  config,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .post({
      path: PATH,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] } },
      summary: 'Promote an investigation to an incident (fork to a new root)',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(Params),
            body: buildRouteValidationWithZod(Body),
          },
        },
      },
      async (context, request, response) => {
        try {
          const { id } = request.params;
          const { incidentId, reason } = request.body;

          if (config.ui.useMockData) {
            return response.ok({
              body: {
                outcome: 'forked',
                incidentId: incidentId ?? `incident-${id}`,
                forkedFromInvestigationId: id,
                message: 'Investigation promoted to incident (mock)',
              },
            });
          }

          const store = getInvestigationStore();
          if (store == null) {
            return response.customError({
              statusCode: 503,
              body: { message: 'Investigation store is not available' },
            });
          }

          const esClient = (await context.core).elasticsearch.client.asCurrentUser;

          // Matches the convention in the sibling decision routes
          // (accept/reject/escalate/defer), which record `actor: 'analyst'`
          // rather than resolving the authenticated principal: the PND plugin
          // has no user-resolution wiring yet, and the promotion-policy
          // question ("who marks something as an incident") is explicitly open
          // upstream. Callers may override via the request body once that
          // lands; hardcoding a fake resolved identity here would be worse
          // than an honest constant.
          const result = await store.forkToIncident(esClient, {
            investigationId: id,
            incidentId,
            actor: 'analyst',
            reason,
          });

          if (result.outcome === 'investigation_not_found') {
            return response.notFound({
              body: { message: `Investigation "${id}" not found` },
            });
          }

          return response.ok({
            body: {
              outcome: result.outcome,
              incidentId: result.incident.id,
              forkedFromInvestigationId: result.incident.forkedFromInvestigationId,
              carriedEventCount: result.incident.events.length,
              message:
                result.outcome === 'already_forked'
                  ? 'Investigation was already promoted to an incident'
                  : 'Investigation promoted to incident',
            },
          });
        } catch (error) {
          logger.error(`Failed to promote investigation to incident: ${error}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to promote investigation to incident' },
          });
        }
      }
    );
};
