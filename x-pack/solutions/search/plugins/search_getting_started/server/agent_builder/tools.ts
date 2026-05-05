/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { SearchGettingStartedStartDependencies } from '../types';

export const MANAGE_INFERENCE_CONFIG_TOOL_ID = 'search.manage_inference_config' as const;

const schema = z.object({
  operation: z
    .enum(['list_features', 'list_endpoints', 'set_feature_endpoints'])
    .describe(
      'The operation to perform:\n' +
        '  - "list_features": List all registered Kibana AI features and their currently assigned inference endpoint.\n' +
        '  - "list_endpoints": List all inference endpoints (connectors) available in this deployment.\n' +
        '  - "set_feature_endpoints": Assign an ordered list of inference endpoints to a specific feature. ' +
        'The first entry is the primary model; the rest are fallbacks. Pass an empty array to clear the admin override.'
    ),
  featureId: z
    .string()
    .optional()
    .describe(
      'Required for "set_feature_endpoints". The featureId exactly as returned by "list_features".'
    ),
  endpointIds: z
    .array(z.string())
    .optional()
    .describe(
      'Required for "set_feature_endpoints". Ordered list of endpoint connector IDs. ' +
        'First entry = primary model, subsequent entries = fallbacks. ' +
        'Pass [] to clear the admin override and revert to the recommended/default endpoint.'
    ),
  taskTypeFilter: z
    .string()
    .optional()
    .describe(
      'Optional. Used with "list_endpoints" to filter results by task type ' +
        '(e.g. "sparse_embedding", "text_embedding", "rerank", "completion").'
    ),
});

export const createManageInferenceConfigTool = (
  coreSetup: CoreSetup<SearchGettingStartedStartDependencies>
): BuiltinToolDefinition<typeof schema> => ({
  id: MANAGE_INFERENCE_CONFIG_TOOL_ID,
  type: ToolType.builtin,
  tags: ['search'],
  description:
    'Manage Kibana AI feature inference configuration. Supports three operations:\n' +
    '1. "list_features" — show all AI features and which inference endpoint is currently assigned to each.\n' +
    '2. "list_endpoints" — show all available inference endpoints/connectors in this deployment.\n' +
    '3. "set_feature_endpoints" — assign an ordered list of endpoints to a feature, supporting reordering, ' +
    'single-model assignment, or clearing an admin override. ' +
    'Always call "list_features" first to confirm featureId values, and "list_endpoints" to discover available endpoint IDs.',
  schema,
  handler: async ({ operation, featureId, endpointIds, taskTypeFilter }, context) => {
    const [, startDeps] = await coreSetup.getStartServices();
    const siePlugin = startDeps.searchInferenceEndpoints;

    if (!siePlugin) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: 'The searchInferenceEndpoints plugin is not available in this deployment.',
            },
          },
        ],
      };
    }

    // ── list_features ──────────────────────────────────────────────────────────
    if (operation === 'list_features') {
      const allFeatures = siePlugin.features.getAll();

      const settled = await Promise.allSettled(
        allFeatures.map(async (feature) => {
          const resolved = await siePlugin.endpoints.getForFeature(
            feature.featureId,
            context.request
          );
          const assignedEndpoint = resolved.endpoints[0];
          return {
            featureId: feature.featureId,
            featureName: feature.featureName,
            featureDescription: feature.featureDescription,
            parentFeatureId: feature.parentFeatureId ?? null,
            taskType: feature.taskType,
            recommendedEndpoints: feature.recommendedEndpoints,
            assignedEndpointId: assignedEndpoint?.connectorId ?? null,
            assignedEndpointName: assignedEndpoint?.name ?? null,
            adminOverrideActive: resolved.soEntryFound,
            warnings: resolved.warnings,
          };
        })
      );

      const features = settled.map((result, i) => {
        if (result.status === 'fulfilled') return result.value;
        return {
          featureId: allFeatures[i].featureId,
          featureName: allFeatures[i].featureName,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        };
      });

      return {
        results: [
          { type: ToolResultType.other, data: { featureCount: allFeatures.length, features } },
        ],
      };
    }

    // ── list_endpoints ─────────────────────────────────────────────────────────
    if (operation === 'list_endpoints') {
      try {
        const connectors = await siePlugin.endpoints.listAll(context.request);
        const filtered = taskTypeFilter
          ? connectors.filter((c) => c.type === taskTypeFilter)
          : connectors;

        const endpoints = filtered.map((c) => ({
          connectorId: c.connectorId,
          name: c.name,
          taskType: c.type,
        }));

        return {
          results: [
            { type: ToolResultType.other, data: { endpointCount: endpoints.length, endpoints } },
          ],
        };
      } catch (err) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to list inference endpoints: ${
                  err instanceof Error ? err.message : String(err)
                }`,
              },
            },
          ],
        };
      }
    }

    // ── set_feature_endpoints ──────────────────────────────────────────────────
    if (!featureId) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: '"featureId" is required for the "set_feature_endpoints" operation.' },
          },
        ],
      };
    }

    const ids = endpointIds ?? [];

    try {
      await siePlugin.endpoints.setForFeature(featureId, ids);
      const message =
        ids.length === 0
          ? `Admin override cleared for feature "${featureId}". It will now use the recommended or default endpoint.`
          : `Feature "${featureId}" endpoint order updated: [${ids.join(
              ', '
            )}]. The first entry is the primary model.`;

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { success: true, featureId, endpointIds: ids, message },
          },
        ],
      };
    } catch (err) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to update feature "${featureId}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            },
          },
        ],
      };
    }
  },
});
