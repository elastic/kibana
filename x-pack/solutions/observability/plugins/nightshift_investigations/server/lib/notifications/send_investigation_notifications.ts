/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { NotificationPhase } from './notification_routing';
import type { NotificationRoutingClient } from './notification_routing_client';
import type { InvestigationLocator } from '../../../common/locators';
import type { GetInvestigationsClient } from '../../routes/types';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from '../automations/generate_workflow_yaml';
import {
  deliverInvestigationNotifications,
  getStartedMessageTs,
} from './deliver_investigation_notifications';
import type { DeliverInvestigationNotificationsResult } from './deliver_investigation_notifications';

export interface InvestigationNotificationDeps {
  investigationLocator: Pick<InvestigationLocator, 'getRedirectUrl'>;
  getInvestigationsClient: GetInvestigationsClient;
  getActions: () => ActionsPluginStart | undefined;
  getRoutingClient: (
    request: KibanaRequest,
    spaceId: string,
    conversationId: string,
    investigationId: string
  ) => Promise<NotificationRoutingClient>;
}

/** Sends a lifecycle phase using the workflow's authenticated request and persisted routing. */
export const sendInvestigationNotifications = async (
  {
    investigationLocator,
    getInvestigationsClient,
    getActions,
    getRoutingClient,
  }: InvestigationNotificationDeps,
  context: Pick<StepHandlerContext, 'contextManager' | 'logger' | 'abortSignal'>,
  {
    investigationId,
    phase,
    reason,
    onTerminalPhaseSelected,
  }: {
    investigationId: string;
    phase: NotificationPhase;
    reason?: string;
    onTerminalPhaseSelected?: () => Promise<void>;
  }
): Promise<DeliverInvestigationNotificationsResult> => {
  const request = context.contextManager.getFakeRequest();
  const {
    kibanaUrl,
    execution: { id: executionId },
    workflow: { spaceId },
  } = context.contextManager.getContext();
  const client = getInvestigationsClient(request, spaceId);
  const { investigation, conversationId, workflowId, notificationDestinations } =
    await client.getInvestigationExecutionContext(investigationId, executionId);
  const routingClient = await getRoutingClient(request, spaceId, conversationId, investigationId);
  // Without server.publicBaseUrl, the server locator returns a relative URL.
  const result = await deliverInvestigationNotifications({
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
    onTerminalPhaseSelected,
  });
  if (phase === 'started') {
    await recordSlackThreadStatusMessages({
      client,
      routingClient,
      investigationId,
      executionId,
      logger: context.logger,
    });
  }
  return result;
};

/**
 * Hands the message the started phase posted under the caller's Slack message to the Slack thread
 * workflow, which edits it for every reply instead of posting its own. A failure is logged rather
 * than thrown: the message is already posted and recorded, and the thread workflow posts its own
 * message when none is recorded.
 */
const recordSlackThreadStatusMessages = async ({
  client,
  routingClient,
  investigationId,
  executionId,
  logger,
}: {
  client: ReturnType<GetInvestigationsClient>;
  routingClient: NotificationRoutingClient;
  investigationId: string;
  executionId: string;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  try {
    const routing = await routingClient.get();
    for (const destination of routing?.destinations ?? []) {
      const messageTs = routing && getStartedMessageTs(routing, executionId, destination);
      if (
        destination.type === 'slack' &&
        destination.connector_id === ELASTIC_APPS_SLACK_CONNECTOR_ID &&
        destination.thread &&
        messageTs
      ) {
        await client.recordSlackThreadStatusMessage({
          investigationId,
          channel: destination.thread.channel,
          threadTs: destination.thread.thread_ts,
          messageTs,
        });
      }
    }
  } catch (error) {
    logger.warn(
      `Could not record the Slack thread status message for investigation "${investigationId}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
