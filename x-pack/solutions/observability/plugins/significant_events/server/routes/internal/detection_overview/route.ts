/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { isoDateTime, lazySchema, z } from '@kbn/zod/v4';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { filterReadableSourceIds } from '../../utils/resolve_source_ids';
import { listAllSources } from '../../utils/list_all_sources';

const detectionOverviewRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/detection/_overview',
  options: {
    access: 'internal',
    summary: 'Get the detection overview',
    description: 'Get current detection counts for the active space and time range.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: lazySchema(() =>
    z.object({
      query: z.object({
        from: isoDateTime(),
        to: isoDateTime(),
      }),
    })
  ),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
  }): Promise<{
    sources: number;
    knowledge_indicators: number;
    active_rules: number;
    detections: number;
    significant_events: number;
  }> => {
    const scopedClients = await getScopedClients({ request });
    const { sourcesClient, licensing } = scopedClients;

    await assertSignificantEventsAccess({ server, licensing });

    const sources = await listAllSources(sourcesClient);
    const sourceIds = sources.map(({ id }) => id);
    const [readableSourceIds, knowledgeIndicatorClient, detectionClient, eventClient] =
      await Promise.all([
        filterReadableSourceIds(sourceIds, sourcesClient),
        scopedClients.getKnowledgeIndicatorClient(),
        scopedClients.getDetectionClient(),
        scopedClients.getEventSearchClient(),
      ]);

    const [features, unbackedQueries, activeRules, detections, significantEvents] =
      await Promise.all([
        knowledgeIndicatorClient.countFeatures(readableSourceIds),
        knowledgeIndicatorClient.countUnbackedQueries(readableSourceIds),
        knowledgeIndicatorClient.countRuleBackedQueries(readableSourceIds),
        detectionClient
          .findLatestPaginated({ ...params.query, page: 1, perPage: 1 })
          .then(({ total }) => total),
        eventClient
          .findLatestByCurrentStatePaginated({ ...params.query, page: 1, perPage: 1 })
          .then(({ total }) => total),
      ]);

    return {
      sources: sources.length,
      knowledge_indicators: features + unbackedQueries,
      active_rules: activeRules,
      detections,
      significant_events: significantEvents,
    };
  },
});

export const internalDetectionOverviewRoutes = {
  ...detectionOverviewRoute,
};
