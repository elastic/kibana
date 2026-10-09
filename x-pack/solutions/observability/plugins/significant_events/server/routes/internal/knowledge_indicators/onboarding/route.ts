/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ID_LENGTH,
  KIsOnboardingStep,
  SignificantEventsWorkflowStatus,
  type KIsOnboardingStatusResult,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import { StatusError } from '../../../../lib/errors/status_error';
import { listAllSources } from '../../../utils/list_all_sources';
import { sourceIdsArraySchema } from '../../../utils/resolve_source_ids';
import {
  MAX_SOURCES_PER_QUERY,
  type SignificantEventsKIsOnboardingInputs,
} from '../../../../lib/workflows/onboarding_workflow_client';

const timestampFromString = z
  .string()
  .max(MAX_ID_LENGTH)
  .transform((input) => new Date(input).getTime());

const mapStepsToSkipFlags = (
  steps: KIsOnboardingStep[]
): { skipFeatures: boolean; skipQueries: boolean } => ({
  skipFeatures: !steps.includes(KIsOnboardingStep.FeaturesIdentification),
  skipQueries: !steps.includes(KIsOnboardingStep.QueriesGeneration),
});

const onboardingExecuteRoute = createServerRoute({
  endpoint: 'POST /internal/streams/{sourceId}/onboarding/_execute',
  options: {
    access: 'internal',
    summary: 'Onboard source',
    description:
      'Generate features and queries for a source as part of the significant events discovery workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ sourceId: z.string().max(MAX_ID_LENGTH) }),
    body: z.discriminatedUnion('action', [
      z.object({
        action: z.literal('schedule').describe('Schedule a new onboarding workflow run'),
        from: timestampFromString,
        to: timestampFromString,
        steps: z
          .array(z.enum(KIsOnboardingStep))
          .optional()
          .default([KIsOnboardingStep.FeaturesIdentification, KIsOnboardingStep.QueriesGeneration])
          .describe(
            'Optional list of steps to perform as part of source onboarding in the specified sequence. By default it will execute all steps.'
          ),
        connectors: z
          .object({
            features: z
              .string()
              .max(MAX_ID_LENGTH)
              .optional()
              .describe(
                'Chat model connector or inference endpoint ID for feature identification.'
              ),
            queries: z
              .string()
              .max(MAX_ID_LENGTH)
              .optional()
              .describe('Chat model connector or inference endpoint ID for query generation.'),
          })
          .optional()
          .describe(
            'Optional per-step model overrides. When omitted the Significant Events defaults are used.'
          ),
      }),
      z.object({
        action: z.literal('cancel').describe('Cancel an in-progress onboarding workflow'),
      }),
    ]),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowClients,
    maintenanceService,
  }): Promise<KIsOnboardingStatusResult> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, sourcesClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const {
      path: { sourceId },
      body,
    } = params;

    const { source } = await sourcesClient.get(sourceId);

    if (body.action === 'schedule') {
      if (!source.enabled) {
        throw new StatusError('Cannot schedule onboarding for a disabled source', 400);
      }
      await assertNotPaused({ maintenanceService, request });
      const { skipFeatures, skipQueries } = mapStepsToSkipFlags(body.steps);
      const [featuresConnectorId, queriesConnectorId] = await Promise.all([
        skipFeatures
          ? undefined
          : resolveNightshiftModelForRequest({
              request,
              inference: server.inference,
              savedObjects: server.core.savedObjects,
              uiSettings: server.core.uiSettings,
              step: 'kiExtraction',
              requestedId: body.connectors?.features,
            }),
        skipQueries
          ? undefined
          : resolveNightshiftModelForRequest({
              request,
              inference: server.inference,
              savedObjects: server.core.savedObjects,
              uiSettings: server.core.uiSettings,
              step: 'kiQueryGeneration',
              requestedId: body.connectors?.queries,
            }),
      ]);

      const inputs: SignificantEventsKIsOnboardingInputs = {
        sourceId: source.id,
        sourceSlug: source.slug,
        features: {
          skip: skipFeatures,
          start: body.from,
          end: body.to,
          ...(featuresConnectorId && { connectorId: featuresConnectorId }),
        },
        queries: {
          skip: skipQueries,
          ...(queriesConnectorId && { connectorId: queriesConnectorId }),
        },
      };

      const { executionId } = await streamsKIsOnboardingClient.run({ inputs, request });

      return { status: SignificantEventsWorkflowStatus.InProgress, executionId };
    }

    // action === 'cancel'
    // Cancellation may be a no-op (nothing running, or already terminal), so we
    // return the real post-cancel status rather than assuming `canceled`.
    await streamsKIsOnboardingClient.cancel({
      sourceId: source.id,
      sourceSlug: source.slug,
      request,
    });

    return streamsKIsOnboardingClient.getStatus({
      sourceId: source.id,
      sourceSlug: source.slug,
      queryUpdatedAt: source.esql_updated_at,
      request,
    });
  },
});

const onboardingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{sourceId}/onboarding/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of source onboarding',
    description: 'Check the status of onboarding progress for a source',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ sourceId: z.string().max(MAX_ID_LENGTH) }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowClients,
  }): Promise<KIsOnboardingStatusResult> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, sourcesClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const {
      path: { sourceId },
    } = params;

    const { source } = await sourcesClient.get(sourceId);

    return streamsKIsOnboardingClient.getStatus({
      sourceId: source.id,
      sourceSlug: source.slug,
      queryUpdatedAt: source.esql_updated_at,
      request,
    });
  },
});

const onboardingBulkStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/onboarding/_bulk_status',
  options: {
    access: 'internal',
    summary: 'Check the onboarding status of multiple sources',
    description:
      'Check the status of onboarding progress for a list of source ids in a single request.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z.object({
      sourceIds: sourceIdsArraySchema({ min: 1, max: MAX_SOURCES_PER_QUERY }),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowClients,
  }): Promise<Record<string, SignificantEventsWorkflowStatusResult>> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, sourcesClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const {
      body: { sourceIds },
    } = params;

    // Executions are keyed by slug, so ids are resolved through this space's catalog.
    // Anything outside the catalog stays not_started.
    const catalog = await listAllSources(sourcesClient);
    const requestedIds = new Set(sourceIds);
    const knownSources = catalog.filter((source) => requestedIds.has(source.id));
    const knownStatuses = await streamsKIsOnboardingClient.getStatuses({
      sources: knownSources,
      request,
    });

    const statuses: Record<string, SignificantEventsWorkflowStatusResult> = {};
    for (const sourceId of sourceIds) {
      statuses[sourceId] = knownStatuses[sourceId] ?? {
        status: SignificantEventsWorkflowStatus.NotStarted,
        executionId: null,
      };
    }
    return statuses;
  },
});

export const internalKIOnboardingRoutes = {
  ...onboardingExecuteRoute,
  ...onboardingStatusRoute,
  ...onboardingBulkStatusRoute,
};
