/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import {
  RELATIONSHIP_KINDS,
  normalizeRelationshipRecord,
  type RelationshipRecord,
} from '@kbn/entity-store/common';
import { securityTool } from '../constants';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';

const entityRelationshipHistorySchema = z.object({
  entityId: z
    .string()
    .min(1)
    .describe(
      'The EUID of the entity to investigate, e.g. "user:alice@local" or "host:laptopA". ' +
        'This is the primary entity whose relationship history is being queried.'
    ),
  kind: z
    .enum(RELATIONSHIP_KINDS)
    .optional()
    .describe(
      'Filter by relationship type, e.g. "accesses_frequently" or "communicates_with". ' +
        'Omit to return all relationship types.'
    ),
  target: z
    .string()
    .optional()
    .describe(
      'Filter by target entity EUID, e.g. "host:laptopA". Can be combined with "kind" for a ' +
        'precise lookup, or used alone to search across all relationship types.'
    ),
  from: z
    .string()
    .optional()
    .describe('ISO 8601 start of the observation time window, e.g. "2026-05-01T00:00:00Z"'),
  to: z
    .string()
    .optional()
    .describe('ISO 8601 end of the observation time window, e.g. "2026-05-29T23:59:59Z"'),
  sort_order: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(
      '"asc" returns the oldest observation first — use with per_page 1 to find first-seen. ' +
        '"desc" returns the newest first — use with per_page 1 to find last-seen. Defaults to "desc".'
    ),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Number of results to return (default 10). Use 1 with sort_order to get a single boundary date.'
    ),
});

export const SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID = securityTool(
  'entity_relationship_history'
);

export const entityRelationshipHistoryTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger
): BuiltinToolDefinition<typeof entityRelationshipHistorySchema> => {
  return {
    id: SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID,
    type: ToolType.builtin,
    description:
      "Returns the observation history of an entity's relationships — when they were first seen, " +
      'last seen, and what hosts or users they communicated with over a time window. ' +
      'Use this to answer questions like "when did this user first access host:laptopA?", ' +
      '"what hosts did this compromised user touch after the alert fired?", or ' +
      '"has this user ever communicated with this host before?". ' +
      'To find first-seen: use sort_order "asc" with per_page 1. ' +
      'To find last-seen: use sort_order "desc" with per_page 1.',
    schema: entityRelationshipHistorySchema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const base = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (base.status !== 'available') return base;

          const [coreStart] = await core.getStartServices();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const index = `.entities.v2.metadata.security_${spaceId}`;

          const exists = await esClient.indices.exists({ index });
          if (exists) {
            return { status: 'available' };
          }

          return {
            status: 'unavailable',
            reason: 'entity metadata datastream does not exist for this space',
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
    handler: async (
      { entityId, kind, target, from, to, sort_order = 'desc', per_page = 10 },
      { spaceId, esClient }
    ) => {
      logger.debug(
        `${SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID} tool called for entityId: ${entityId}`
      );

      try {
        const [, plugins] = await core.getStartServices();
        const crudClient = plugins.entityStore.createCRUDClient(esClient.asCurrentUser, spaceId);

        const result = await crudClient.listRelationshipMetadata({
          entityId,
          kind,
          target,
          from,
          to,
          sort_order,
          per_page,
        });

        const records = result.records
          .map(normalizeRelationshipRecord)
          .filter((r): r is RelationshipRecord => r !== undefined);

        if (records.length === 0) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: `No relationship metadata found for entity: ${entityId}` },
              },
            ],
          };
        }

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: { total: result.total, records },
            },
          ],
        };
      } catch (error) {
        logger.error(
          `Error in ${SECURITY_ENTITY_RELATIONSHIP_HISTORY_TOOL_ID} tool: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: {
                message: `Error fetching relationship history: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
    tags: ['security', 'entity-analytics', 'entity-relationships'],
  };
};
