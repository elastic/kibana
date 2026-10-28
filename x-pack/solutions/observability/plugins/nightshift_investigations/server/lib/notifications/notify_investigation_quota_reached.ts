/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { consumeAutomationBudget } from '../automations/automation_budget';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from '../automations/generate_workflow_yaml';

/** One marker per Slack channel and UTC day, kept in the automation budget saved object. */
export const getQuotaNoticeId = (channel: string): string =>
  `investigation-quota-notice:${channel}`;

export const INVESTIGATION_QUOTA_REACHED_MESSAGE =
  'The daily limit for automatic investigations has been reached. Raise the limit in the Nightshift settings.';

/**
 * Replies in the Slack thread once per channel and UTC day. Never throws, so a failed post cannot
 * change the skipped start.
 */
export const notifyInvestigationQuotaReached = async ({
  getSoClient,
  getActions,
  request,
  spaceId,
  slackThread,
  signal,
  logger,
}: {
  getSoClient: () => Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;
  getActions: () => ActionsPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  slackThread: { channel: string; thread_ts: string };
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  try {
    // Claimed before posting, so a failed post is not retried.
    const claimed = await consumeAutomationBudget(
      getSoClient(),
      getQuotaNoticeId(slackThread.channel),
      1
    );
    if (!claimed) return;
    const actions = getActions();
    if (!actions) {
      logger.warn('Could not post the investigation quota notice: actions plugin is unavailable');
      return;
    }
    const actionsClient = await actions.getActionsClientWithRequestInSpace(
      request,
      brandSpaceId(spaceId)
    );
    const response = await actionsClient.execute({
      actionId: ELASTIC_APPS_SLACK_CONNECTOR_ID,
      signal,
      params: {
        subAction: 'sendMessage',
        subActionParams: {
          channel: slackThread.channel,
          text: INVESTIGATION_QUOTA_REACHED_MESSAGE,
          threadTs: slackThread.thread_ts,
        },
      },
    });
    if (response.status !== 'ok') {
      logger.warn(
        `Could not post the investigation quota notice: ${
          response.serviceMessage || response.message || 'Slack delivery failed'
        }`
      );
    }
  } catch (error) {
    logger.warn(
      `Could not post the investigation quota notice: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};
