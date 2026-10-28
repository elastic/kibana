/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { NightshiftSettingsLocator } from '../../../common/locators';
import { consumeAutomationBudget } from '../automations/automation_budget';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from '../automations/generate_workflow_yaml';

/** One marker per Slack channel and UTC day, kept in the automation budget saved object. */
export const getQuotaNoticeId = (channel: string): string =>
  `investigation-quota-notice:${channel}`;

const QUOTA_REACHED = 'The daily limit for automatic investigations has been reached.';

/** Readers may lack the privilege to change settings, so the text addresses an admin. */
export const getInvestigationQuotaReachedMessage = (settingsUrl?: string): string =>
  settingsUrl
    ? `${QUOTA_REACHED} An admin can raise the limit in <${settingsUrl}|Nightshift settings>.`
    : `${QUOTA_REACHED} An admin can raise the limit in the Nightshift settings.`;

/** Absolute settings URL in the workflow's space, or undefined when it can't be built. */
export const getNightshiftSettingsUrl = ({
  locator,
  spaceId,
  kibanaUrl,
}: {
  locator: Pick<NightshiftSettingsLocator, 'getRedirectUrl'>;
  spaceId: string;
  kibanaUrl?: string;
}): string | undefined => {
  if (!kibanaUrl) return undefined;
  try {
    return new URL(
      locator.getRedirectUrl({ tab: 'investigations' }, { spaceId }),
      kibanaUrl
    ).toString();
  } catch {
    return undefined;
  }
};

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
  settingsLocator,
  kibanaUrl,
  signal,
  logger,
}: {
  getSoClient: () => Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;
  getActions: () => ActionsPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  slackThread: { channel: string; thread_ts: string };
  settingsLocator: Pick<NightshiftSettingsLocator, 'getRedirectUrl'>;
  kibanaUrl?: string;
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
          text: getInvestigationQuotaReachedMessage(
            getNightshiftSettingsUrl({ locator: settingsLocator, spaceId, kibanaUrl })
          ),
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
