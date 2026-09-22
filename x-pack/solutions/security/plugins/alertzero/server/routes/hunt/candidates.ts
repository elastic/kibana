/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  API_VERSIONS,
  CandidatesRequestBody,
  CandidatesResponse,
  INTERNAL_API_ACCESS,
} from '@kbn/alertzero-common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_INTERNAL_ROUTE_BASE } from '../../../common/constants';
import { buildCandidateQuery } from '../../services/watches/hunt/common/build_candidate_query';
import type { OpenProposalConversationIdsReader } from '../../services/watches/hunt/common/build_candidate_query';
import type { RouteDependencies } from '../register_routes';

export const CANDIDATES_URL = `${HUNT_INTERNAL_ROUTE_BASE}/candidates` as const;

/**
 * An "active" Hunt Proposal, per the selection contract: awaiting a decision, or
 * decided and currently running. The remaining statuses (`expired`, `failed`,
 * `no_action`, `succeeded`) are terminal, so a report carrying only those is
 * free to be hunted again.
 */
const OPEN_PROPOSAL_STATUSES = ['pending', 'executing'] as const;

/** Returns the candidate report ids the next hunt fan-out will process. */
export const registerCandidatesRoute = ({
  router,
  logger,
  getSpaceId,
  getHuntServices,
}: RouteDependencies): void => {
  router.versioned
    .post({
      path: CANDIDATES_URL,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: {
          requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ],
        },
      },
      summary: 'Get candidate report ids for the next hunt run',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: buildRouteValidationWithZod(CandidatesRequestBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const { reportIds, limit } = request.body;

          const trigger =
            reportIds && reportIds.length > 0 ? ('manual' as const) : ('scheduled' as const);

          const proposalsService = getHuntServices().getProposalsService();
          const readOpenProposalConversationIds: OpenProposalConversationIdsReader = async (
            space
          ) => {
            const results = await Promise.all(
              OPEN_PROPOSAL_STATUSES.map((status) =>
                proposalsService.list(
                  { status, excludeSuperseded: true, excludeExpired: true, size: 50, from: 0 },
                  space
                )
              )
            );
            return new Set(
              results.flatMap((page) => page.proposals.map((proposal) => proposal.conversationId))
            );
          };

          const body: CandidatesResponse = await buildCandidateQuery(
            esClient,
            logger,
            {
              trigger,
              reportIds: reportIds ?? undefined,
              spaceId,
              limit,
            },
            readOpenProposalConversationIds
          );

          return response.ok({ body });
        } catch (err) {
          logger.error(`candidates route failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to build candidate query' },
          });
        }
      }
    );
};
