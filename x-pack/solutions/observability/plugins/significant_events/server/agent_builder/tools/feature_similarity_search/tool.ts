/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { nightshiftSourceSlugField } from '@kbn/nightshift-shared';
import { z } from '@kbn/zod/v4';
import type { SignificantEventsServer } from '../../../types';
import type { GetScopedClients } from '../../../routes/types';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import {
  FEATURE_SIMILARITY_TOOL_DESCRIPTION,
  MAX_SEARCH_CANDIDATES,
  featureCandidateSchema,
  searchFeaturesForCandidates,
} from '../../../lib/significant_events/features/feature_similarity_search';
import { createSignificantEventsAvailability } from '../significant_events_availability';
import {
  loadSourceCatalog,
  resolveSourcesBySlug,
  toSourceRef,
} from '../../utils/resolve_source_slugs';

export const SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID =
  platformSignificantEventsTools.searchSimilarFeatures;

const featureSimilaritySearchSchema = z.object({
  slug: nightshiftSourceSlugField('Disabled sources are included.'),
  candidates: z
    .array(featureCandidateSchema)
    .max(MAX_SEARCH_CANDIDATES)
    .describe('Candidate features to check in one call. Results are grouped by candidate_id.'),
});

export const createFeatureSimilaritySearchTool = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: SignificantEventsServer;
  logger: Logger;
}): StaticToolRegistration<typeof featureSimilaritySearchSchema> => {
  const toolDefinition: BuiltinToolDefinition<typeof featureSimilaritySearchSchema> = {
    id: SIGNIFICANT_EVENTS_FEATURE_SIMILARITY_SEARCH_TOOL_ID,
    type: ToolType.builtin,
    description: FEATURE_SIMILARITY_TOOL_DESCRIPTION,
    annotations: {
      title: 'Search Similar Feature Knowledge Indicators',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: featureSimilaritySearchSchema,
    tags: ['streams', 'significant-events'],
    availability: createSignificantEventsAvailability({ server, logger }),
    handler: async ({ slug, candidates }, context) => {
      try {
        const scopedClients = await getScopedClients({ request: context.request });
        await assertSignificantEventsAccess({
          server,
          licensing: scopedClients.licensing,
        });
        const catalog = await loadSourceCatalog(scopedClients.sourcesClient);
        const [source] = resolveSourcesBySlug(catalog, [slug]);
        const kiClient = await scopedClients.getKnowledgeIndicatorClient();

        const groups = await searchFeaturesForCandidates({
          kiClient,
          streamName: source.id,
          candidates,
        });
        const sourceRef = toSourceRef(source);

        return {
          results: groups.map((group) => ({
            type: ToolResultType.other,
            data: { ...sourceRef, ...group },
          })),
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`Feature similarity search failed: ${message}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
};
