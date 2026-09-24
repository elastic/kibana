/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { reconcileSourceCatalog } from './reconcile_source_catalog';

export interface StreamsWithIndicatorsResponse {
  streams: Array<{ streamName: string }>;
}

/**
 * Lists every enabled source the sync sweep must reconcile. Independent of
 * `_eligible`: the sweep runs regardless of extraction interval, exclusions,
 * or the continuous-extraction toggle. The response key stays `streamName`
 * so the managed sync workflow YAML can keep reading it. The value is the
 * source id.
 */
export const streamsWithIndicatorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_knowledge_indicators/_streams_with_indicators',
  options: {
    access: 'internal',
    summary: 'List streams to reconcile',
    description:
      'Returns every stream with an active knowledge indicator or a Streams-owned rule, used by the managed KI sync workflow to fan out reconciliation.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({
    request,
    getScopedClients,
    server,
    workflowClients,
    maintenanceService,
  }): Promise<StreamsWithIndicatorsResponse> => {
    const { getKnowledgeIndicatorClient, licensing, sourcesClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const kiClient = await getKnowledgeIndicatorClient();
    const { sources, reconcileIds } = await reconcileSourceCatalog({
      sourcesClient,
      kiClient,
      onboardingClient: workflowClients.streamsKIsOnboardingClient,
      maintenanceService,
      request,
    });
    const enabledSourceIds = new Set(
      sources.filter((source) => source.enabled).map((source) => source.id)
    );
    const sourceIds = reconcileIds.filter((sourceId) => enabledSourceIds.has(sourceId));

    return { streams: sourceIds.map((sourceId) => ({ streamName: sourceId })) };
  },
});

export const syncRoutes = {
  ...streamsWithIndicatorsRoute,
};
