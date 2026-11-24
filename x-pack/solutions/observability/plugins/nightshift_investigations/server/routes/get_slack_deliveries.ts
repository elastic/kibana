/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { lazySchema, z } from '@kbn/zod/v4';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { MAX_KEYWORD_LENGTH } from '../../common';
import { getSlackDeliveryStatus } from '../lib/notifications/slack_delivery_status';
import { createNightshiftInvestigationsServerRoute } from './create_server_route';
import { rethrowInvestigationClientError } from './rethrow_investigation_client_error';

export const getSlackDeliveriesRoute = createNightshiftInvestigationsServerRoute({
  endpoint: 'GET /internal/nightshift/investigations/{id}/slack_deliveries',
  options: {
    access: 'internal',
    summary: 'Get recorded Slack delivery status',
    description:
      'Returns the latest recorded status for each Slack destination on an investigation or run.',
  },
  security: {
    authz: { requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read, 'read_investigations'] },
  },
  params: lazySchema(() =>
    z.object({
      path: z.object({ id: z.string().min(1).max(MAX_KEYWORD_LENGTH) }),
      query: z
        .object({ executionId: z.string().min(1).max(MAX_KEYWORD_LENGTH).optional() })
        .optional(),
    })
  ),
  handler: async ({
    request,
    params,
    getInvestigationsClient,
    getNotificationRoutingClient,
    getWorkflowsManagement,
    getSpaceId,
  }) => {
    const { id } = params.path;
    const executionId = params.query?.executionId;
    const spaceId = getSpaceId(request);
    try {
      await getInvestigationsClient(request).getNotifiableInvestigation(id);
    } catch (error) {
      rethrowInvestigationClientError(error);
    }
    const client = await getNotificationRoutingClient(request, spaceId, id, id);
    const routing = await client.get();
    if (!routing) return { deliveries: [] };
    if (!executionId) return { deliveries: getSlackDeliveryStatus(routing) };

    // Starts return the bound run. Its shared investigation child normally owns the receipts.
    const management = getWorkflowsManagement()?.management;
    if (!management) throw serverUnavailable('Workflows management is not available');
    const children = await management.getChildWorkflowExecutions(executionId, spaceId, request);
    const executionIds = new Set([
      executionId,
      ...children
        .filter(({ workflowId }) => workflowId === NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID)
        .map((child) => child.executionId),
    ]);
    return { deliveries: getSlackDeliveryStatus(routing, executionIds) };
  },
});
