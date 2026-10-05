/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { Logger } from '@kbn/core/server';
import { MAX_ID_LENGTH } from '@kbn/significant-events-schema';
import {
  QUERY_GENERATION_EXCLUDED_FEATURE_TYPES,
  toFeatureForLlmContext,
} from '@kbn/nightshift-ai';
import { z } from '@kbn/zod/v4';
import type { GetScopedClients } from '../../../../routes/types';
import { streamToAnalysisTarget } from '../../../../lib/significant_events/stream_to_analysis_target';

export const SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID = 'platform.sig_events.ki_features_get';

const getFeaturesSchema = z.object({
  target_id: z.string().max(MAX_ID_LENGTH).describe('Target identifier for KI feature lookup.'),
  feature_types: z
    .array(z.string().max(MAX_ID_LENGTH))
    .max(20)
    .optional()
    .describe('Optional KI feature types to return. Unknown types produce no matches.'),
  min_confidence: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Only return features with confidence at or above this value (0-100). Omit to include inferred low-confidence features.'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe(
      'Maximum number of features to return, highest confidence first. Omit on the first call to load all features; combine with min_confidence for focused follow-up calls.'
    ),
});

export const createGetFeaturesTool = ({
  getScopedClients,
  logger,
}: {
  getScopedClients: GetScopedClients;
  logger: Logger;
}): BuiltinSkillBoundedTool<typeof getFeaturesSchema> => {
  return {
    id: SIGNIFICANT_EVENTS_GET_FEATURES_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Load the extracted and computed KI features for a target before generating detection queries.',
    schema: getFeaturesSchema,
    handler: async (
      { target_id: targetId, feature_types: featureTypes, min_confidence: minConfidence, limit },
      context
    ) => {
      try {
        const scopedClients = await getScopedClients({ request: context.request });
        const stream = await scopedClients.streamsClient.getStream(targetId);
        const target = streamToAnalysisTarget(stream);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();
        const { hits } = await kiClient.getFeatures(target.id, {
          type: featureTypes,
          minConfidence,
          limit,
          excludedType: [...QUERY_GENERATION_EXCLUDED_FEATURE_TYPES],
        });
        const features = hits.map(toFeatureForLlmContext);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: { features, count: features.length },
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Get features failed: ${message}`);
        return {
          results: [{ type: ToolResultType.error, data: { message } }],
        };
      }
    },
  };
};
