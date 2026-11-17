/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  WORKER_SERVICE_ACCOUNT_NAMES,
  getWorkerRoleName,
} from '@kbn/alertzero-common';
import { ALERTZERO_API_PRIVILEGE_READ, HUNT_LIBRARY_URL } from '../../../common/constants';
import type {
  HuntHistoryResponse,
  HuntLaunchResponse,
  HuntSessionVerification,
} from '../../../common/hunt_library';
import { HUNT_SESSION_HANDLE_MAX_LENGTH } from '../../../common/hunt_library_profile_state';
import { readHuntUserKey, resolveHuntSession } from '../../hunt_library/session_lookup';
import type {
  HuntAvailability,
  HuntLibraryDetail,
  HuntLibraryListItem,
  HuntLibraryListResponse,
} from '../../../common/hunt_library';
import {
  buildAvailabilityCacheKey,
  checkHuntAvailability,
  HuntAvailabilityCache,
  uncoveredByScope,
} from '../../hunt_library/availability';
import { listHuntHistory } from '../../hunt_library/history';
import type { HuntDefinition } from '../../hunt_library/hunt_definition';
import { HuntSessionConflictError, launchManualSession } from '../../hunt_library/manual_session';
import { getHuntDefinition, HUNT_DEFINITIONS } from '../../hunt_library/seed';
import {
  readWorkerRole,
  uncoveredPatterns,
} from '../../services/watches/hunt/common/role_pattern_coverage';
import { resolveHuntUniverse } from '../hunt/resolve_hunt_universe';
import type { RouteDependencies } from '../register_routes';
import { withAlertZeroEnabled } from '../with_alertzero_enabled';

const MAX_DEFINITION_ID_LENGTH = 128;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toListFields = (definition: HuntDefinition) => ({
  id: definition.id,
  version: definition.version,
  name: definition.name,
  description: definition.description,
  platform: [...definition.platform],
  mitreTechniques: [...definition.mitreTechniques],
  resultKind: definition.query.resultKind,
});

const toDetail = (
  definition: HuntDefinition,
  callerAvailability: HuntAvailability,
  workerAvailability: HuntAvailability
): HuntLibraryDetail => {
  const { query, source } = definition;
  return {
    ...toListFields(definition),
    hypothesis: definition.hypothesis,
    references: [...definition.references],
    guidance: {
      analystNotes: [...definition.guidance.analystNotes],
      expectedFalsePositives: [...definition.guidance.expectedFalsePositives],
      suggestedPivots: [...definition.guidance.suggestedPivots],
    },
    query: {
      id: query.id,
      query: query.query,
      defaultTimeRange: query.defaultTimeRange,
      recommendedColumns: [...query.recommendedColumns],
      requiredIndexPatterns: [...query.requiredIndexPatterns],
      requiredFields: [...query.requiredFields],
    },
    source: { tradeId: source.tradeId, path: source.path, revision: source.revision },
    callerAvailability,
    workerAvailability,
  };
};

/**
 * Read API for the curated Hunt Library: the catalog list with the caller's availability, and one
 * hunt's detail with caller and worker availability. Requires AlertZero Read; nothing here writes.
 */
export const registerHuntLibraryRoutes = ({
  router,
  logger,
  getSpaceId,
  getWorkflowsManagement,
  resolveUserNames,
  isServerless,
}: RouteDependencies) => {
  const cache = new HuntAvailabilityCache();

  const callerAvailability = async ({
    esClient,
    spaceId,
    userKey,
    universe,
    definition,
  }: {
    esClient: ElasticsearchClient;
    spaceId: string;
    userKey: string;
    universe: string[];
    definition: HuntDefinition;
  }): Promise<HuntAvailability> =>
    cache.get(buildAvailabilityCacheKey({ spaceId, definition, identity: 'caller', userKey }), () =>
      checkHuntAvailability({
        esClient,
        definition,
        identity: 'caller',
        checkScope: (required) => ({ details: uncoveredByScope(universe, required) }),
        probe: true,
        logger,
      })
    );

  const workerAvailability = async ({
    esClient,
    spaceId,
    definition,
    roleName,
  }: {
    esClient: ElasticsearchClient;
    spaceId: string;
    definition: HuntDefinition;
    roleName: string;
  }): Promise<HuntAvailability> =>
    cache.get(buildAvailabilityCacheKey({ spaceId, definition, identity: 'worker' }), () =>
      checkHuntAvailability({
        esClient,
        definition,
        identity: 'worker',
        checkScope: async (required) => {
          const role = await readWorkerRole({ esClient, roleName, isServerless });
          if (!role) return { details: ['worker_role_unreadable'] };
          return { details: uncoveredPatterns({ role, patterns: required, isServerless }) };
        },
        // A caller request cannot run a query as the worker's service account.
        probe: false,
        logger,
      })
    );

  const readUserKey = async (context: Parameters<typeof resolveHuntUniverse>[0]) => {
    const core = (await context.core) as unknown as {
      security?: {
        authc?: { getCurrentUser: () => { profile_uid?: string; username?: string } | null };
      };
    };
    return readHuntUserKey(core.security?.authc?.getCurrentUser());
  };

  router.versioned
    .get({
      path: HUNT_LIBRARY_URL,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] } },
      summary: 'List Hunt Library hunts with the caller availability',
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: { request: {} } },
      withAlertZeroEnabled(async (context, request, response) => {
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const universe = await resolveHuntUniverse(context, logger);
          const userKey = await readUserKey(context);

          const hunts: HuntLibraryListItem[] = await Promise.all(
            HUNT_DEFINITIONS.map(async (definition) => ({
              ...toListFields(definition),
              availability: await callerAvailability({
                esClient,
                spaceId,
                userKey,
                universe,
                definition,
              }),
            }))
          );
          const body: HuntLibraryListResponse = { hunts };
          return response.ok({ body });
        } catch (err) {
          logger.error(`Failed to list Hunt Library hunts: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to list Hunt Library hunts' },
          });
        }
      })
    );

  router.versioned
    .get({
      path: `${HUNT_LIBRARY_URL}/{id}`,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] } },
      summary: 'Get one Hunt Library hunt with caller and worker availability',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({ minLength: 1, maxLength: MAX_DEFINITION_ID_LENGTH }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        const definition = getHuntDefinition(request.params.id);
        if (!definition) {
          return response.notFound({ body: { message: 'Hunt not found' } });
        }
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const universe = await resolveHuntUniverse(context, logger);
          const userKey = await readUserKey(context);
          const roleName = getWorkerRoleName(
            WORKER_SERVICE_ACCOUNT_NAMES[SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID],
            { isServerless }
          );

          const [caller, worker] = await Promise.all([
            callerAvailability({ esClient, spaceId, userKey, universe, definition }),
            workerAvailability({ esClient, spaceId, definition, roleName }),
          ]);
          return response.ok({ body: toDetail(definition, caller, worker) });
        } catch (err) {
          logger.error(`Failed to read Hunt Library hunt: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to read Hunt Library hunt' },
          });
        }
      })
    );

  router.versioned
    .get({
      path: `${HUNT_LIBRARY_URL}/{id}/history`,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] } },
      summary: 'List the manual run history of one Hunt Library hunt in this space',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({ minLength: 1, maxLength: MAX_DEFINITION_ID_LENGTH }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        const definition = getHuntDefinition(request.params.id);
        if (!definition) {
          return response.notFound({ body: { message: 'Hunt not found' } });
        }
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }
        try {
          const history = await listHuntHistory({
            client: management,
            request,
            spaceId: getSpaceId(request),
            definitionId: definition.id,
            resolveUserNames,
          });
          const body: HuntHistoryResponse = { history };
          return response.ok({ body });
        } catch (err) {
          logger.error(`Failed to read Hunt Library history: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to read Hunt Library history' },
          });
        }
      })
    );

  router.versioned
    .post({
      path: `${HUNT_LIBRARY_URL}/{id}/launch`,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] } },
      summary: 'Record a manual Hunt Library session as exploratory run history',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string({ minLength: 1, maxLength: MAX_DEFINITION_ID_LENGTH }),
            }),
            body: schema.object({
              session_id: schema.string({
                minLength: 36,
                maxLength: 36,
                validate: (value) => (UUID_PATTERN.test(value) ? undefined : 'must be a UUID'),
              }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        const definition = getHuntDefinition(request.params.id);
        if (!definition) {
          return response.notFound({ body: { message: 'Hunt not found' } });
        }
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }
        try {
          const spaceId = getSpaceId(request);
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const universe = await resolveHuntUniverse(context, logger);
          const userKey = await readUserKey(context);

          // A hunt the caller cannot run is not launched, so history never records a dead start.
          const availability = await callerAvailability({
            esClient,
            spaceId,
            userKey,
            universe,
            definition,
          });
          if (!availability.available) {
            return response.conflict({
              body: {
                message: 'This hunt is not available for you',
                attributes: { reason: availability.firstFailure },
              },
            });
          }

          const result = await launchManualSession({
            client: management,
            request,
            spaceId,
            definition,
            sessionId: request.body.session_id,
            logger,
          });
          const body: HuntLaunchResponse = {
            session_id: result.sessionId,
            execution_id: result.executionId,
            reused_existing: result.reusedExisting,
            profile_token: result.executionId,
          };
          return response.ok({ body });
        } catch (err) {
          if (err instanceof HuntSessionConflictError) {
            return response.conflict({ body: { message: err.message } });
          }
          logger.error(`Failed to launch Hunt Library session: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to launch Hunt Library session' },
          });
        }
      })
    );

  router.versioned
    .post({
      path: `${HUNT_LIBRARY_URL}/profile_state/verify`,
      access: INTERNAL_API_ACCESS,
      security: { authz: { requiredPrivileges: [ALERTZERO_API_PRIVILEGE_READ] } },
      summary: 'Resolve a Hunt session and return the hunt guidance for Discover',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            body: schema.object({
              token: schema.string({ minLength: 1, maxLength: HUNT_SESSION_HANDLE_MAX_LENGTH }),
            }),
          },
        },
      },
      withAlertZeroEnabled(async (context, request, response) => {
        const management = getWorkflowsManagement();
        if (!management) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Workflows are not available' },
          });
        }

        let result;
        try {
          result = await resolveHuntSession({
            management,
            request,
            spaceId: getSpaceId(request),
            sessionExecutionId: request.body.token,
            userKey: await readUserKey(context),
          });
        } catch (err) {
          logger.error(`Failed to resolve Hunt session: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: 'Failed to resolve the Hunt session' },
          });
        }
        if (!result.ok) {
          return response.badRequest({
            body: {
              message: 'Invalid Hunt session state',
              attributes: { reason: result.reason },
            },
          });
        }

        const { claims: payload, expiresAt } = result;
        const definition = getHuntDefinition(payload.definitionId);
        if (!definition || definition.version !== payload.definitionVersion) {
          return response.conflict({
            body: {
              message: 'This hunt changed since the session started',
              attributes: { reason: 'definition_changed' },
            },
          });
        }

        const body: HuntSessionVerification = {
          session_id: payload.sessionId,
          session_execution_id: payload.sessionExecutionId,
          ...(payload.investigationId ? { investigation_id: payload.investigationId } : {}),
          expires_at: expiresAt.toISOString(),
          definition: {
            id: definition.id,
            version: definition.version,
            name: definition.name,
            hypothesis: definition.hypothesis,
            resultKind: definition.query.resultKind,
            references: [...definition.references],
            guidance: {
              analystNotes: [...definition.guidance.analystNotes],
              expectedFalsePositives: [...definition.guidance.expectedFalsePositives],
              suggestedPivots: [...definition.guidance.suggestedPivots],
            },
          },
        };
        return response.ok({ body });
      })
    );
};
