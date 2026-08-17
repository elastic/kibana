/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import { ProductFeatureKey } from '@kbn/security-solution-features/keys';
import type { ExperimentalFeatures } from '../../../../common';
import { IdentifierType } from '../../../../common/api/entity_analytics/common/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import type { ProductFeaturesService } from '../../../lib/product_features_service';
import { securityTool } from '../constants';
import { buildRenderAttachmentTag } from './attachment_utils';
import { getEntityAnalyticsToolAvailability } from './entity_analytics_availability';
import { requireResolvedEntity } from './entity_resolution';
import {
  buildEntityGraphAttachmentId,
  ensureEntityGraphAttachment,
} from './entity_graph_attachment_utils';
import { createToolTelemetryTracker } from './tool_telemetry_tracker';

const schema = z.object({
  entityType: IdentifierType.describe(
    'The type of entity: host, user, service, or generic'
  ).optional(),
  entityId: z
    .string()
    .min(1)
    .describe(
      'The entity id (EUID), canonical entity.name, or user.full_name to render the relationship graph for. ' +
        'Examples: "host:server1" (prefixed EUID), "server1" (non-prefixed), ' +
        '"LAPTOP-SALES04" (entity.name), "John Doe" (user.full_name). ' +
        'When a security.entity attachment identifies the target, use its prefixed entity id here.'
    ),
});

const DEFAULT_ENTITY_GRAPH_TIME_RANGE = { from: 'now-30d', to: 'now' } as const;

export const SECURITY_GET_ENTITY_GRAPH_TOOL_ID = securityTool('get_entity_graph');

export const getEntityGraphTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  productFeaturesService: ProductFeaturesService
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_GET_ENTITY_GRAPH_TOOL_ID,
    type: ToolType.builtin,
    description: `Render the relationship-graph preview for a single security entity (host, user, service, generic) from the Entity Store. Use this when the user asks to see the graph for an entity or how an entity is connected to other entities, events, or alerts (e.g. "show me the graph for this host", "how is this user connected?", "visualize relationships for host:server1"). Read-only — it does not modify anything.

This tool resolves the entity, then stores a \`security.entity_graph\` attachment (creating new or updating existing) and returns an \`other\` result containing a pre-formatted \`renderTag\` string. To show the interactive graph preview inline, copy that \`renderTag\` string VERBATIM onto its own line in your reply, followed by a blank line, before your prose. Do NOT assemble the tag yourself from \`attachmentId\` and \`version\`, and do NOT substitute the id with anything derived from the user's prompt.

When the id/name resolves to multiple candidate entities, no attachment is stored, no \`renderTag\` is returned, and you must NOT emit a render tag — instead ask the user to supply the exact entity id (EUID) from the returned candidates. This tool renders a compact preview; the full interactive graph investigation lives in the Security UI and is reachable from the preview's "Open full graph" affordance.`,
    schema,
    tags: ['security', 'entity-store', 'entity-analytics', 'graph'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        const entityAnalyticsAvailability = await getEntityAnalyticsToolAvailability({
          core,
          request,
          spaceId,
          experimentalFeatures,
          logger,
          minLicense: 'platinum',
        });
        if (entityAnalyticsAvailability.status !== 'available') {
          return entityAnalyticsAvailability;
        }

        try {
          if (!productFeaturesService.isEnabled(ProductFeatureKey.graphVisualization)) {
            return {
              status: 'unavailable',
              reason: 'The entity relationship graph is not enabled for this project tier.',
            };
          }
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check graph availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }

        return { status: 'available' };
      },
    },
    handler: async (params, { spaceId, esClient, attachments }) => {
      logger.debug(
        `${SECURITY_GET_ENTITY_GRAPH_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      const { entityType, entityId } = params;
      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_GET_ENTITY_GRAPH_TOOL_ID,
        spaceId,
        actionType: 'read',
        entityTypes: entityType ? [entityType] : [],
      });
      telemetryTracker.recordResultCount(0);

      try {
        const client = esClient.asCurrentUser;
        const resolved = await requireResolvedEntity({
          esClient: client,
          spaceId,
          entityId,
          entityType,
        });
        if (!resolved.ok) {
          return { results: resolved.results };
        }

        const { identifierType, identifier, entityStoreId } = resolved.identity;
        const attachmentLabel = `${identifierType}: ${identifier}`;

        const attachmentResult = await ensureEntityGraphAttachment({
          attachments,
          id: buildEntityGraphAttachmentId(identifierType, entityStoreId),
          data: {
            identifierType,
            identifier,
            entityStoreId,
            timeRange: DEFAULT_ENTITY_GRAPH_TIME_RANGE,
            attachmentLabel,
          },
          description: attachmentLabel,
          logger,
        });

        if (!attachmentResult) {
          telemetryTracker.recordFailure('Failed to persist the graph preview attachment');
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: `Resolved ${identifierType} "${identifier}" but the graph preview could not be prepared.`,
                },
              },
            ],
          };
        }

        telemetryTracker.recordResultCount(1);

        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                attachmentId: attachmentResult.attachmentId,
                version: attachmentResult.version,
                renderTag: buildRenderAttachmentTag(attachmentResult),
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error rendering entity graph preview: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
