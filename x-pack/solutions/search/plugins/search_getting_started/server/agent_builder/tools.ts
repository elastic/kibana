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
