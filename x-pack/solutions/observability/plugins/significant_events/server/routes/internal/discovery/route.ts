/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  MAX_ID_LENGTH,
  SIGNIFICANT_EVENTS_ALERT_SOURCE,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { z, lazySchema } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { resolveNightshiftModelForRequest } from '@kbn/nightshift-ai';
import { FeatureNotEnabledError } from '../../../lib/errors/feature_not_enabled_error';
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

const optionalCount = lazySchema(() => z.number().int().min(0).optional());

const discoveryStartedRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/discovery/_started',
  params: lazySchema(() =>
    z.object({
      body: z.object({
        discovery_execution_id: z.string().max(MAX_ID_LENGTH),
        // Empty when the discovery workflow was run directly, with no parent execution.
        parent_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
      }),
    })
  ),
  options: {
    access: 'internal',
    summary: 'Report the start of a Significant Events discovery run',
    description:
      'Emits the discovery-started telemetry event for the reporting discovery workflow execution.',
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
    getSpaceId,
    server,
    telemetry,
  }): Promise<{ acknowledged: true }> => {
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const { discovery_execution_id: discoveryExecutionId, parent_execution_id: parentExecutionId } =
      params.body;

    telemetry.trackSignificantEventsDiscoveryStarted({
      ...(parentExecutionId ? { execution_id: parentExecutionId } : {}),
      discovery_execution_id: discoveryExecutionId,
      space_id: await getSpaceId(request),
      alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
    });
    return { acknowledged: true };
  },
});

/** Called by the discovery workflow before each exit and from its failure fallback (nightshift-program#1956). */
const discoveryCompletedRoute = createServerRoute({
  endpoint: 'POST /internal/streams/significant_events/discovery/_completed',
  params: lazySchema(() =>
    z.object({
      body: z.object({
        discovery_execution_id: z.string().max(MAX_ID_LENGTH),
        parent_execution_id: z.string().max(MAX_ID_LENGTH).optional(),
        outcome: z.enum(['completed', 'failed']),
        has_work: z.boolean().optional(),
        budget_denied: z.boolean().optional(),
        processed_count: optionalCount,
        skipped_count: optionalCount,
        held_back_count: optionalCount,
        needs_agent_count: optionalCount,
        written_rule_count: optionalCount,
        classifier_failed: z.boolean().optional(),
        error_type: z.string().max(MAX_ID_LENGTH).optional(),
        error_message: z.string().max(1024).optional(),
      }),
    })
  ),
  options: {
    access: 'internal',
    summary: 'Report the end of a Significant Events discovery run',
    description:
      'Emits the discovery-completed telemetry event for the reporting discovery workflow execution, paired to the execution that started it.',
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
    logger,
  }): Promise<{ acknowledged: true }> => {
    const { significantEventsDiscoveryClient } = workflowClients;
    if (!significantEventsDiscoveryClient) {
      throw new FeatureNotEnabledError(
        'Significant events discovery requires the workflows feature to be enabled'
      );
    }
    const { licensing } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });
    const spaceId = await getSpaceId(request);
    const {
      discovery_execution_id: discoveryExecutionId,
      parent_execution_id: parentExecutionId,
      outcome,
      error_type: errorType,
      error_message: errorMessage,
      ...counts
    } = params.body;

    // The report must land even when the execution record cannot be read.
    const execution = await significantEventsDiscoveryClient
      .getExecution({ id: discoveryExecutionId, spaceId, request })
      .catch((error) => {
        logger.debug(
          `discovery-completed: could not read the discovery execution: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return undefined;
      });
    // The management client resolves an unknown execution id to null rather than throwing.
    const durationMs = !execution
      ? undefined
      : execution.finishedAt
      ? execution.duration
      : Date.now() - Date.parse(execution.startedAt);

    telemetry.trackSignificantEventsDiscoveryCompleted({
      ...(parentExecutionId ? { execution_id: parentExecutionId } : {}),
      discovery_execution_id: discoveryExecutionId,
      space_id: spaceId,
      alert_source: SIGNIFICANT_EVENTS_ALERT_SOURCE,
      // A step timeout reaches the failure fallback as a `TimeoutError`.
      outcome: outcome === 'failed' && errorType === 'TimeoutError' ? 'timed_out' : outcome,
      ...(durationMs !== undefined ? { duration_ms: durationMs } : {}),
      ...counts,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    });
    return { acknowledged: true };
  },
});

export const internalDiscoveryRoutes = {
  ...discoveryExecuteRoute,
  ...discoveryStatusRoute,
  ...discoveryStartedRoute,
  ...discoveryCompletedRoute,
};
