/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import type { KibanaRequest } from '@kbn/core/server';
import { notificationPhaseSchema } from '../lib/notifications/notification_routing';
import type { NotificationRoutingClient } from '../lib/notifications/notification_routing_client';
import { MAX_KEYWORD_LENGTH } from '../../common';
import type { InvestigationLocator } from '../../common/locators';
import type { GetInvestigationsClient } from '../routes/types';
import { deliverInvestigationNotifications } from '../lib/notifications/deliver_investigation_notifications';

const inputSchema = z.object({
  investigation_id: z
    .string()
    .min(1)
    .max(MAX_KEYWORD_LENGTH)
    .describe('The investigation receiving lifecycle notifications'),
  phase: notificationPhaseSchema,
  reason: z.string().max(MAX_TEXT_LENGTH).optional(),
});

export const sendNotificationsStepDefinition = ({
  investigationLocator,
  getInvestigationsClient,
  getActions,
  getRoutingClient,
}: {
  investigationLocator: Pick<InvestigationLocator, 'getRedirectUrl'>;
  getInvestigationsClient: GetInvestigationsClient;
  getActions: () => ActionsPluginStart | undefined;
  getRoutingClient: (
    request: KibanaRequest,
    spaceId: string,
    conversationId: string,
    investigationId: string
  ) => Promise<NotificationRoutingClient>;
}) =>
  createServerStepDefinition({
    id: 'nightshift.sendNotifications',
    label: 'Send Nightshift Notifications',
    category: StepCategory.Ai,
    description:
      'Sends investigation lifecycle messages and records their delivery in the notification routing attachment.',
    inputSchema,
    outputSchema: z.object({
      sent: z.number().describe('Destinations that received the message in this run'),
      failed: z.number().describe('Destinations whose delivery failed in this run'),
      unconfirmed: z.number().describe('Attempts without a confirmed delivery result'),
    }),
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      const {
        kibanaUrl,
        execution: { id: executionId },
        workflow: { spaceId },
      } = context.contextManager.getContext();
      const { investigation_id: investigationId, phase, reason } = inputSchema.parse(context.input);
      const client = getInvestigationsClient(request, spaceId);
      const { investigation, conversationId, workflowId, notificationDestinations } =
        await client.getInvestigationExecutionContext(investigationId, executionId);
      const routingClient = await getRoutingClient(
        request,
        spaceId,
        conversationId,
        investigationId
      );
      // Without server.publicBaseUrl, the server locator returns a relative URL.
      const output = await deliverInvestigationNotifications({
        investigation,
        executionId,
        workflowId,
        notificationDestinations,
        phase,
        reason,
        routingClient,
        investigationUrl: new URL(
          investigationLocator.getRedirectUrl({ investigationId }, { spaceId }),
          kibanaUrl
        ).toString(),
        logger: context.logger,
        getExecute: async () => {
          const actions = getActions();
          if (!actions) {
            throw new Error('actions plugin is not available');
          }
          const actionsClient = await actions.getActionsClientWithRequestInSpace(
            request,
            brandSpaceId(spaceId)
          );
          return (execution) => actionsClient.execute(execution);
        },
        signal: context.abortSignal,
      });
      return { output };
    },
  });
