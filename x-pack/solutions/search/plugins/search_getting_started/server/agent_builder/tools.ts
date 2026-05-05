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

export const LIST_INFERENCE_FEATURES_TOOL_ID = 'search.list_inference_features' as const;
export const SET_INFERENCE_FEATURE_TOOL_ID = 'search.set_inference_feature_endpoint' as const;
export const LIST_INFERENCE_ENDPOINTS_TOOL_ID = 'search.list_inference_endpoints' as const;

const schema = z.object({});

export const createListInferenceFeaturesTool = (
  coreSetup: CoreSetup<SearchGettingStartedStartDependencies>
): BuiltinToolDefinition<typeof schema> => ({
  id: LIST_INFERENCE_FEATURES_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Lists all registered Kibana AI features and subfeatures. For each feature, returns its name, task type, recommended inference endpoints, and the currently assigned inference endpoint name and ID (which may come from an admin-configured override or fall back to the recommended or system default). Call this tool when asked which model or endpoint is assigned to a Kibana AI feature.',
  tags: ['search'],
  schema,
  handler: async (_args, context) => {
    const [, startDeps] = await coreSetup.getStartServices();
    const siePlugin = startDeps.searchInferenceEndpoints;

    if (!siePlugin) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              featureCount: 0,
              features: [],
              note: 'The searchInferenceEndpoints plugin is not available in this deployment.',
            },
          },
        ],
      };
    }

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
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        featureId: allFeatures[i].featureId,
        featureName: allFeatures[i].featureName,
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { featureCount: allFeatures.length, features },
        },
      ],
    };
  },
});

const setFeatureSchema = z.object({
  featureId: z
    .string()
    .describe(
      'The featureId of the Kibana AI feature to configure, exactly as returned by the list_inference_features tool.'
    ),
  endpointId: z
    .string()
    .nullable()
    .describe(
      'The inference endpoint connector ID to assign (e.g. ".elser_model_2"). Pass null to clear the admin override and revert to the recommended or default endpoint.'
    ),
});

export const createSetInferenceFeatureTool = (
  coreSetup: CoreSetup<SearchGettingStartedStartDependencies>
): BuiltinToolDefinition<typeof setFeatureSchema> => ({
  id: SET_INFERENCE_FEATURE_TOOL_ID,
  type: ToolType.builtin,
  tags: ['search'],
  description:
    'Assigns an inference endpoint to a specific Kibana AI feature, or clears an existing admin override. Use this after listing available endpoints with list_inference_endpoints and features with list_inference_features.',
  schema: setFeatureSchema,
  handler: async ({ featureId, endpointId }, context) => {
    const [, startDeps] = await coreSetup.getStartServices();
    const siePlugin = startDeps.searchInferenceEndpoints;

    if (!siePlugin) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'The searchInferenceEndpoints plugin is not available.' },
          },
        ],
      };
    }

    try {
      await siePlugin.endpoints.setForFeature(featureId, endpointId);
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              featureId,
              assignedEndpointId: endpointId,
              message:
                endpointId !== null
                  ? `Feature "${featureId}" is now assigned to endpoint "${endpointId}".`
                  : `Admin override cleared for feature "${featureId}". It will now use the recommended or default endpoint.`,
            },
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

const listEndpointsSchema = z.object({
  taskType: z
    .string()
    .optional()
    .describe(
      "Optional task type to filter by (e.g. 'sparse_embedding', 'text_embedding', 'rerank'). If omitted, all available endpoints are returned."
    ),
});

export const createListInferenceEndpointsTool = (
  coreSetup: CoreSetup<SearchGettingStartedStartDependencies>
): BuiltinToolDefinition<typeof listEndpointsSchema> => ({
  id: LIST_INFERENCE_ENDPOINTS_TOOL_ID,
  type: ToolType.builtin,
  tags: ['search'],
  description:
    'Lists all inference endpoints (connectors) available in this Kibana deployment. Returns the connector ID, name, and task type for each. Use this to discover what endpoints exist before calling set_inference_feature_endpoint.',
  schema: listEndpointsSchema,
  handler: async ({ taskType }, context) => {
    const [, startDeps] = await coreSetup.getStartServices();
    const siePlugin = startDeps.searchInferenceEndpoints;

    if (!siePlugin) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              endpointCount: 0,
              endpoints: [],
              note: 'searchInferenceEndpoints plugin not available.',
            },
          },
        ],
      };
    }

    try {
      const connectors = await siePlugin.endpoints.listAll(context.request);
      const filtered = taskType ? connectors.filter((c) => c.type === taskType) : connectors;

      const endpoints = filtered.map((c) => ({
        connectorId: c.connectorId,
        name: c.name,
        taskType: c.type,
      }));

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { endpointCount: endpoints.length, endpoints },
          },
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
  },
});
