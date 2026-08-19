/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType, type ErrorResult } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { KibanaRequest } from '@kbn/core/server';
import {
  ENTITY_METADATA,
  RELATIONSHIP_KINDS,
  getEntitiesAlias,
  getEntityMetadataAlias,
  getMetadataEntityIndexPattern,
  normalizeRelationshipRecord,
} from '@kbn/entity-store/common';
import type { Logger } from '@kbn/logging';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { ExperimentalFeatures } from '../../../../common';
import { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { securityTool } from '../constants';
import { getEntityAnalyticsToolAvailability } from './entity_analytics_availability';
import { requireResolvedEntity } from './entity_resolution';
import { parseTimeBound, timeRangeParseError } from './time_range_utils';
import { createToolTelemetryTracker } from './tool_telemetry_tracker';

const schema = z.object({
  entityType: IdentifierType.describe(
    'The type of the subject entity: host, user, service, or generic'
  ).optional(),
  entityId: z
    .string()
    .min(1)
    .describe(
      'The subject entity id (EUID), canonical entity.name, or user.full_name whose relationship history to query. ' +
        'Examples: "user:alice@local" (prefixed EUID), "alice@local" (non-prefixed), "Alice" (name). ' +
        'When a security.entity attachment identifies the subject, use its prefixed entity id here.'
    ),
  kind: z
    .enum(RELATIONSHIP_KINDS)
    .optional()
    .describe(
      'Filter by relationship type, e.g. "accesses_frequently" or "communicates_with". ' +
        'Omit to return all relationship types.'
    ),
  targetType: IdentifierType.describe(
    'The type of the relationship target entity: host, user, service, or generic. ' +
      'Optional; helps disambiguate when resolving target by name.'
  ).optional(),
  target: z
    .string()
    .min(1)
    .max(512)
    .optional()
    .describe(
      'Filter by relationship target — prefixed EUID, canonical name, or full name ' +
        '(same resolution as entityId). Examples: "host:laptopA", "laptopA". ' +
        'Combine with "kind" for a precise lookup, or use alone to search across all relationship types. ' +
        'Optional targetType helps disambiguate.'
    ),
  from: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Start of the time range in Kibana date-math (e.g. "now-30d", "now-1y", "2026-01-01"). ' +
        'For "last 30 days" pass from="now-30d"; for a calendar date use ISO.'
    ),
  to: z
    .string()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'End of the time range in Kibana date-math (e.g. "now", "2026-03-15"). Omit to leave the range open-ended.'
    ),
  sortOrder: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(
      '"asc" returns the oldest record first — use with maxResults 1 to find first-seen. ' +
        '"desc" returns the newest first — use with maxResults 1 to find last-seen. Defaults to "desc".'
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Maximum number of relationship observations to return (default 50, max 100). ' +
        'Use 1 with sortOrder for a single first/last-seen boundary. ' +
        'For "what did they touch in the last N days" lists, omit or use a higher value; ' +
        'if total exceeds the returned records, say the result is truncated.'
    ),
});

export const SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID = securityTool(
  'entity_relationship_history'
);

const checkMetadataReadAccess = async ({
  request,
  security,
  spaceId,
}: {
  request: KibanaRequest;
  security: SecurityPluginStart;
  spaceId: string;
}): Promise<{ allowed: true } | { allowed: false; result: ErrorResult }> => {
  const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
  // Same indices as entity-store `check_privileges` with includeMetadataPrivileges.
  const { hasAllRequested } = await checkPrivileges({
    elasticsearch: {
      cluster: [],
      index: {
        [getEntityMetadataAlias(spaceId)]: ['read'],
        [getMetadataEntityIndexPattern(spaceId)]: ['read'],
      },
    },
  });

  if (hasAllRequested) {
    return { allowed: true };
  }

  return {
    allowed: false,
    result: {
      tool_result_id: getToolResultId(),
      type: ToolResultType.error,
      data: {
        message: 'You do not have permission to read entity relationship history in this space.',
      },
    },
  };
};

export const entityRelationshipHistoryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID,
    type: ToolType.builtin,
    description: `Returns the temporal relationship event history for a security entity from the entity metadata log — when relationships were first/last observed, and which hosts or users an entity related to over a time window. Use for questions like "when did this user first access host:laptopA?", "what hosts did this user communicate with in the last 30 days?", or "has this user ever accessed this host before?".

Do NOT use this for generic entity profiles, risk history, or profile trends — those belong to security.get_entity (with interval/date for profile_history). Do NOT use this to render a relationship graph — use security.get_entity_graph.

First-seen: sortOrder "asc" with maxResults 1. Last-seen: sortOrder "desc" with maxResults 1. Resolves subject and optional target names to canonical EUIDs via the entity store (same as get_entity / get_entity_graph); when multiple candidates match, ask the user to pick an exact EUID.`,
    schema,
    tags: ['security', 'entity-analytics', 'entity-relationships'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        const entityStoreAvailability = await getEntityAnalyticsToolAvailability({
          core,
          request,
          spaceId,
          experimentalFeatures,
          logger,
        });
        if (entityStoreAvailability.status !== 'available') {
          return entityStoreAvailability;
        }

        try {
          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const index = getEntitiesAlias(ENTITY_METADATA, spaceId);

          const exists = await esClient.indices.exists({ index });
          if (exists) {
            return { status: 'available' };
          }

          return {
            status: 'unavailable',
            reason: 'Entity metadata datastream does not exist for this space',
          };
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check entity metadata datastream availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (params, { spaceId, esClient, request }) => {
      logger.debug(
        `${SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const {
        entityType,
        entityId,
        kind,
        target,
        targetType,
        from,
        to,
        sortOrder = 'desc',
        maxResults = 50,
      } = params;

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID,
        spaceId,
        actionType: 'read',
        entityTypes: entityType ? [entityType] : [],
      });
      telemetryTracker.recordResultCount(0);

      try {
        const [, { security, entityStore }] = await core.getStartServices();
        const accessResult = await checkMetadataReadAccess({ request, security, spaceId });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const client = esClient.asCurrentUser;

        const resolvedSubject = await requireResolvedEntity({
          esClient: client,
          spaceId,
          entityId,
          entityType,
        });
        if (!resolvedSubject.ok) {
          return { results: resolvedSubject.results };
        }

        const resolvedTarget =
          target !== undefined
            ? await requireResolvedEntity({
                esClient: client,
                spaceId,
                entityId: target,
                entityType: targetType,
              })
            : undefined;
        if (resolvedTarget !== undefined && !resolvedTarget.ok) {
          return { results: resolvedTarget.results };
        }

        const { entityStoreId } = resolvedSubject.identity;
        const resolvedTargetId =
          resolvedTarget !== undefined ? resolvedTarget.identity.entityStoreId : undefined;

        // time range is optional, so only validate if values are provided
        if ((from && !parseTimeBound(from)) || (to && !parseTimeBound(to, true))) {
          const error = timeRangeParseError(from, to);
          telemetryTracker.recordFailure(error.data.message);
          return { results: [error] };
        }

        const relationshipsClient = entityStore.createRelationshipsClient(client, spaceId);

        const result = await relationshipsClient.listRelationshipMetadata({
          entityId: entityStoreId,
          kind,
          target: resolvedTargetId,
          from,
          to,
          sortOrder,
          perPage: maxResults,
          page: 1,
        });

        const records = result.records
          .map(normalizeRelationshipRecord)
          .filter((r): r is NonNullable<typeof r> => r !== undefined);

        telemetryTracker.recordResultCount(records.length);

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                entityId: entityStoreId,
                ...(resolvedTargetId !== undefined ? { target: resolvedTargetId } : {}),
                total: result.total,
                truncated: result.total > maxResults,
                records,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        telemetryTracker.recordFailure(errorMessage);
        logger.error(
          `Error in ${SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID} tool: ${errorMessage}`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error fetching relationship history: ${errorMessage}`,
              },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
