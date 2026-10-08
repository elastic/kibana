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
import {
  reconcileSourceCatalog,
  reconcileSourceRevision,
  resetSourceKnowledge,
  applySourceEnabled,
} from './reconcile_source_catalog';

export interface StreamsWithIndicatorsResponse {
  sources: Array<{ sourceId: string }>;
}

/**
 * Lists every enabled source of the request space the sync sweep must reconcile.
 * Independent of `_eligible`: the sweep runs regardless of extraction interval,
 * exclusions, or the continuous onboarding toggle. The managed sync workflow
 * YAML reads `sources[].sourceId`.
 */
export const streamsWithIndicatorsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_knowledge_indicators/_streams_with_indicators',
  options: {
    access: 'internal',
    summary: 'List sources to reconcile',
    description:
      'Returns every source with an active knowledge indicator or an owned rule, used by the managed KI sync workflow to fan out reconciliation.',
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
    const {
      getKnowledgeIndicatorClient,
      licensing,
      sourcesClient,
      sourceKnowledgeState,
      scheduleSourceOnboarding,
    } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing });

    const kiClient = await getKnowledgeIndicatorClient();
    const { sources, reconcileIds } = await reconcileSourceCatalog({
      sourcesClient,
      kiClient,
      sourceKnowledgeState,
      scheduleSourceOnboarding,
      onboardingClient: workflowClients.streamsKIsOnboardingClient,
      maintenanceService,
      request,
    });
    const enabledSourceIds = new Set(
      sources.filter((source) => source.enabled).map((source) => source.id)
    );
    const sourceIds = reconcileIds.filter((sourceId) => enabledSourceIds.has(sourceId));

    return { sources: sourceIds.map((sourceId) => ({ sourceId })) };
  },
});

const reconcileSourceRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{sourceId}/_reconcile_source',
  options: { access: 'internal', summary: 'Apply a source query or enablement change' },
  security: { authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage] } },
  params: z.object({
    path: z.object({ sourceId: z.string().min(1).max(255) }),
    body: z.object({ sourceSlug: z.string().min(1).max(255) }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    workflowClients,
    maintenanceService,
    server,
  }): Promise<{ reconciled: boolean }> => {
    const {
      licensing,
      sourcesClient,
      sourceKnowledgeState,
      scheduleSourceOnboarding,
      getKnowledgeIndicatorClient,
    } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const kiClient = await getKnowledgeIndicatorClient();
    const onboardingClient = workflowClients.streamsKIsOnboardingClient;
    const { sources } = await sourcesClient.list({
      ids: [params.path.sourceId],
      page: 1,
      perPage: 1,
    });
    const source = sources[0];
    if (!source) {
      await resetSourceKnowledge({
        source: { id: params.path.sourceId, slug: params.body.sourceSlug },
        kiClient,
        onboardingClient,
        sourceKnowledgeState,
        request,
      });
      return { reconciled: true };
    }
    await reconcileSourceRevision({
      source,
      sourcesClient,
      kiClient,
      onboardingClient,
      sourceKnowledgeState,
      // A created or edited source gets its one-time onboarding even with continuous onboarding off.
      scheduleSourceOnboarding: (scheduled) =>
        scheduleSourceOnboarding(scheduled, { ignoreContinuousSetting: true }),
      request,
    });
    await applySourceEnabled({
      sourceKnowledgeState,
      source,
      kiClient,
      onboardingClient,
      getMaintenanceState: () => maintenanceService.getState({ request }),
      request,
    });
    return { reconciled: true };
  },
});

export const syncRoutes = {
  ...reconcileSourceRoute,
  ...streamsWithIndicatorsRoute,
};
