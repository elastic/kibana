/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import {
  MAX_ID_LENGTH,
  KIsOnboardingStep,
  SignificantEventsWorkflowStatus,
  type KIsOnboardingStatusResult,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';

import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import { listAllSources } from '../../../utils/list_all_sources';
import {
  MAX_STREAMS_PER_QUERY,
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
  endpoint: 'POST /internal/streams/{streamName}/onboarding/_execute',
  options: {
    access: 'internal',
    summary: 'Onboard stream',
    description:
      'Generate features and queries for a stream as part of the significant events discovery workflow.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
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
            'Optional list of steps to perform as part of stream onboarding in the specified sequence. By default it will execute all steps.'
          ),
        connectors: z
          .object({
            features: z
              .string()
              .max(255)
              .optional()
              .describe('Connector ID for features identification.'),
            queries: z
              .string()
              .max(255)
              .optional()
              .describe('Connector ID for queries generation.'),
          })
          .optional()
          .describe(
            'Optional per-step connector overrides. When omitted the server resolves connectors from the inference feature registry.'
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
      path: { streamName },
      body,
    } = params;

    const { source } = await sourcesClient.get(streamName);

    if (body.action === 'schedule') {
      await assertNotPaused({ maintenanceService, request });
      const { skipFeatures, skipQueries } = mapStepsToSkipFlags(body.steps);

      const inputs: SignificantEventsKIsOnboardingInputs = {
        streamName: source.id,
        features: {
          skip: skipFeatures,
          start: body.from,
          end: body.to,
          ...(body.connectors?.features && { connectorId: body.connectors.features }),
        },
        queries: {
          skip: skipQueries,
          ...(body.connectors?.queries && { connectorId: body.connectors.queries }),
        },
      };

      const { executionId } = await streamsKIsOnboardingClient.run({ inputs, request });

      return { status: SignificantEventsWorkflowStatus.InProgress, executionId };
    }

    // action === 'cancel'
    // Cancellation may be a no-op (nothing running, or already terminal), so we
    // return the real post-cancel status rather than assuming `canceled`.
    await streamsKIsOnboardingClient.cancel({ streamName: source.id, request });

    return streamsKIsOnboardingClient.getStatus({ streamName: source.id });
  },
});

const onboardingStatusRoute = createServerRoute({
  endpoint: 'GET /internal/streams/{streamName}/onboarding/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of stream onboarding',
    description: 'Check the status of onboarding progress for a stream',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    path: z.object({ streamName: z.string().max(MAX_ID_LENGTH) }),
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
      path: { streamName },
    } = params;

    const { source } = await sourcesClient.get(streamName);

    return streamsKIsOnboardingClient.getStatus({ streamName: source.id });
  },
});

const onboardingBulkStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/onboarding/_bulk_status',
  options: {
    access: 'internal',
    summary: 'Check the onboarding status of multiple streams',
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
      streamNames: z
        .array(z.string().max(MAX_STREAM_NAME_LENGTH))
        .min(1)
        .max(MAX_STREAMS_PER_QUERY),
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
      body: { streamNames },
    } = params;

    // Executions are stored in the default space. Only ids in this space's catalog
    // are looked up; anything else stays not_started.
    const catalogIds = new Set((await listAllSources(sourcesClient)).map((source) => source.id));
    const knownIds = streamNames.filter((sourceId) => catalogIds.has(sourceId));
    const knownStatuses = await streamsKIsOnboardingClient.getStatuses({ streamNames: knownIds });

    const statuses: Record<string, SignificantEventsWorkflowStatusResult> = {};
    for (const sourceId of streamNames) {
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
