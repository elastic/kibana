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
import type { InvestigationQuotaLimit } from '../../types';

/**
 * One marker per Slack channel, limit and UTC day, kept in the automation budget saved object. The
 * automatic limit keeps the id it had before there were other limits.
 */
export const getQuotaNoticeId = (
  channel: string,
  deniedBy: InvestigationQuotaLimit = 'automatic'
): string =>
  deniedBy === 'automatic'
    ? `investigation-quota-notice:${channel}`
    : `investigation-quota-notice:${deniedBy}:${channel}`;

const countOf = (limit: number, noun: string): string =>
  `${limit} ${noun}${limit === 1 ? '' : 's'}`;

const QUOTA_REACHED: Record<InvestigationQuotaLimit, (limit?: number) => string> = {
  automatic: (limit) =>
    limit === undefined
      ? "today's limit for automatic investigations across all automations"
      : `today's limit of ${countOf(limit, 'automatic investigation')} across all automations`,
  manual: (limit) =>
    limit === undefined
      ? "today's limit for manual investigations"
      : `today's limit of ${countOf(limit, 'manual investigation')}`,
  all: (limit) =>
    limit === undefined
      ? "today's limit for all investigations"
      : `today's limit of ${countOf(limit, 'investigation')} in total`,
};

/** Readers may lack the privilege to change settings, so the text addresses an admin. */
export const getInvestigationQuotaReachedMessage = ({
  settingsUrl,
  limit,
  deniedBy = 'automatic',
}: {
  settingsUrl?: string;
  limit?: number;
  deniedBy?: InvestigationQuotaLimit;
} = {}): string => {
  const settings = settingsUrl !== undefined ? `<${settingsUrl}|settings>` : 'settings';
  return `Elastic nightshift has reached ${QUOTA_REACHED[deniedBy](
    limit
  )}. New investigations resume at 00:00 UTC, or an admin can raise the limit in ${settings}.`;
};

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
  deniedBy = 'automatic',
  settingsLocator,
  kibanaUrl,
  limit,
  signal,
  logger,
}: {
  getSoClient: () => Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;
  getActions: () => ActionsPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  slackThread: { channel: string; thread_ts: string };
  /** The limit that denied the start. */
  deniedBy?: InvestigationQuotaLimit;
  settingsLocator: Pick<NightshiftSettingsLocator, 'getRedirectUrl'>;
  kibanaUrl?: string;
  limit?: number;
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  try {
    // Claimed before posting, so a failed post is not retried.
    const claimed = await consumeAutomationBudget(
      getSoClient(),
      getQuotaNoticeId(slackThread.channel, deniedBy),
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
          text: getInvestigationQuotaReachedMessage({
            settingsUrl: getNightshiftSettingsUrl({ locator: settingsLocator, spaceId, kibanaUrl }),
            limit,
            deniedBy,
          }),
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
