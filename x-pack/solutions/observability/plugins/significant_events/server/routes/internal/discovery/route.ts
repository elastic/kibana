/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MAX_ID_LENGTH,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { searchKnowledgeIndicatorsForRequest } from '../../../agent_builder/tools/search_knowledge_indicators/search_for_request';
import { FeatureNotEnabledError } from '../../../lib/errors/feature_not_enabled_error';
import {
  buildDiscoveryContext,
  type DiscoveryContext,
} from '../../../lib/significant_events/discovery_context';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../utils/assert_not_paused';

const discoveryExecuteRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/discovery/_execute',
  params: z.object({
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('trigger'),
        connector_id: z
          .string()
          .max(MAX_ID_LENGTH)
          .optional()
          .describe('Optional chat model connector or inference endpoint ID for this run.'),
      }),
      z.object({ action: z.literal('cancel') }),
    ]),
  }),
  options: {
    access: 'internal',
    summary: 'Manually trigger the Significant Events pipeline',
    description:
      'Executes the Significant Events orchestrator workflow for the current space. Runs detection and discovery in sequence.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
    telemetry,
    maintenanceService,
  }): Promise<{ executionId: string | null }> => {
    const { significantEventsDiscoveryClient } = workflowClients;
    if (!significantEventsDiscoveryClient) {
      throw new FeatureNotEnabledError(
        'Significant events discovery requires the workflows feature to be enabled'
      );
    }

    const { licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const spaceId = await getSpaceId(request);
    const { body } = params;

    if (body.action === 'trigger') {
      await assertNotPaused({ maintenanceService, request });
      const { executionId, isNew } = await significantEventsDiscoveryClient.run({
        request,
        spaceId,
        agentBuilder: server.agentBuilder,
        connectorId: body.connector_id,
        resolveModel: (requestedId) =>
          resolveNightshiftModelForRequest({
            request,
            inference: server.inference,
            savedObjects: server.core.savedObjects,
            uiSettings: server.core.uiSettings,
            step: 'discovery',
            requestedId,
          }),
      });
      if (isNew) {
        telemetry.trackSignificantEventsDiscoveryTriggered({
          execution_id: executionId,
          space_id: spaceId,
        });
      }
      return { executionId };
    }

    const executionId = await significantEventsDiscoveryClient.cancel({ request, spaceId });
    return { executionId };
  },
});

const discoveryStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/significant_events/discovery/_status',
  params: z.object({}),
  options: {
    access: 'internal',
    summary: 'Get the status of the Significant Events discovery pipeline',
    description:
      'Returns the status of the most recent Significant Events orchestrator workflow execution for the current space.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    request,
    getScopedClients,
    workflowClients,
    getSpaceId,
    server,
  }): Promise<SignificantEventsWorkflowStatusResult> => {
    const { significantEventsDiscoveryClient } = workflowClients;
    if (!significantEventsDiscoveryClient) {
      throw new FeatureNotEnabledError('Significant events discovery is not available');
    }
    const { licensing } = await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const spaceId = await getSpaceId(request);
    return significantEventsDiscoveryClient.getStatus({ spaceId, request });
  },
});

const MAX_CONTEXT_RULES = 100;
const MAX_CONTEXT_SOURCES = 20;

const discoveryContextRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/discovery/_context',
  params: z.object({
    body: z.object({
      rule_uuids: z.array(z.string().max(MAX_ID_LENGTH)).min(1).max(MAX_CONTEXT_RULES),
      source_ids: z.array(z.string().max(MAX_ID_LENGTH)).max(MAX_CONTEXT_SOURCES),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'Get the knowledge indicator context of a detection batch',
    description:
      'Returns the query knowledge indicators of the given rules and the features they reference, as the grounding skill would retrieve them with `ki_search`.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<DiscoveryContext> => {
    const { rule_uuids: ruleUuids, source_ids: sourceIds } = params.body;
    return buildDiscoveryContext({
      ruleUuids,
      sourceIds,
      search: (toolParams) =>
        searchKnowledgeIndicatorsForRequest({
          request,
          getScopedClients,
          server,
          logger,
          toolParams,
        }),
    });
  },
});

export const internalDiscoveryRoutes = {
  ...discoveryExecuteRoute,
  ...discoveryStatusRoute,
  ...discoveryContextRoute,
};
