/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { brandSpaceId } from '@kbn/core-spaces-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { KibanaRequest, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { InvestigationNotificationDestination } from '../../../common';
import type { NightshiftSettingsLocator } from '../../../common/locators';
import { consumeAutomationBudget } from '../automations/automation_budget';
import { ELASTIC_APPS_SLACK_CONNECTOR_ID } from '../automations/generate_workflow_yaml';
import type { InvestigationQuotaLimit } from '../../types';

export interface LimitNoticeTarget {
  connectorId: string;
  channel: string;
  threadTs?: string;
}

export type LimitNoticeReason =
  | { type: 'quota'; deniedBy: InvestigationQuotaLimit; limit?: number }
  | { type: 'automation'; automationId: string; automationName: string; limit?: number };

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

const getLimitNoticeId = (channel: string, reason: LimitNoticeReason): string =>
  reason.type === 'quota'
    ? getQuotaNoticeId(channel, reason.deniedBy)
    : `automation-limit-notice:${reason.automationId}:${channel}`;

/**
 * A run started by a Slack message hears back in its thread. Any other run notifies the channels
 * its automation posts to, at top level; thread-mode destinations are skipped.
 */
export const getLimitNoticeTargets = ({
  slackThread,
  notificationDestinations = [],
}: {
  slackThread?: { channel: string; thread_ts: string };
  notificationDestinations?: InvestigationNotificationDestination[];
}): LimitNoticeTarget[] => {
  if (slackThread) {
    return [
      {
        connectorId: ELASTIC_APPS_SLACK_CONNECTOR_ID,
        channel: slackThread.channel,
        threadTs: slackThread.thread_ts,
      },
    ];
  }
  return notificationDestinations.flatMap(({ type, connector_id: connectorId, params }) => {
    const { channel, thread_ts: threadTs } = params;
    return type === 'slack' && typeof channel === 'string' && channel && threadTs === undefined
      ? [{ connectorId, channel }]
      : [];
  });
};

const countOf = (limit: number, noun: string): string =>
  `${limit} ${noun}${limit === 1 ? '' : 's'}`;

// https://docs.slack.dev/messaging/formatting-message-text#escaping
const escapeSlackText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const getAutomationLimitReachedMessage = ({
  automationName,
  limit,
}: {
  automationName: string;
  limit?: number;
}): string => {
  const name = escapeSlackText(automationName.replace(/\s+/g, ' ').trim());
  const reached =
    limit === undefined
      ? 'its daily limit'
      : `its daily limit of ${countOf(limit, 'investigation')}`;
  return `The automation *${name}* has reached ${reached}. It resumes at 00:00 UTC, or an admin can raise the limit on the automation.`;
};

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
  const reached = `Elastic nightshift has reached ${QUOTA_REACHED[deniedBy](limit)}.`;
  if (limit === 0) {
    return `${reached} New investigations stay blocked until an admin changes the limit or turns off enforcement in ${settings}.`;
  }
  return `${reached} New investigations resume at 00:00 UTC, or an admin can raise the limit in ${settings}.`;
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

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Posts the limit notice to each target once per channel, limit and UTC day. Never throws, so a
 * failed post cannot change the skipped start.
 */
export const notifyInvestigationLimitReached = async ({
  getSoClient,
  getActions,
  request,
  spaceId,
  targets,
  reason,
  settingsLocator,
  kibanaUrl,
  signal,
  logger,
}: {
  getSoClient: () => Pick<SavedObjectsClientContract, 'get' | 'create' | 'update'>;
  getActions: () => ActionsPluginStart | undefined;
  request: KibanaRequest;
  spaceId: string;
  targets: LimitNoticeTarget[];
  reason: LimitNoticeReason;
  settingsLocator: Pick<NightshiftSettingsLocator, 'getRedirectUrl'>;
  kibanaUrl?: string;
  signal: AbortSignal;
  logger: Pick<Logger, 'warn'>;
}): Promise<void> => {
  if (targets.length === 0) return;
  const text =
    reason.type === 'quota'
      ? getInvestigationQuotaReachedMessage({
          settingsUrl: getNightshiftSettingsUrl({ locator: settingsLocator, spaceId, kibanaUrl }),
          limit: reason.limit,
          deniedBy: reason.deniedBy,
        })
      : getAutomationLimitReachedMessage(reason);
  try {
    const soClient = getSoClient();
    let actionsClient:
      | Awaited<ReturnType<ActionsPluginStart['getActionsClientWithRequestInSpace']>>
      | undefined;
    for (const { connectorId, channel, threadTs } of targets) {
      try {
        // Claimed before posting, so a failed post is not retried.
        const claimed = await consumeAutomationBudget(
          soClient,
          getLimitNoticeId(channel, reason),
          1
        );
        if (!claimed) continue;
        if (!actionsClient) {
          const actions = getActions();
          if (!actions) {
            logger.warn(
              'Could not post the investigation limit notice: actions plugin is unavailable'
            );
            return;
          }
          actionsClient = await actions.getActionsClientWithRequestInSpace(
            request,
            brandSpaceId(spaceId)
          );
        }
        const response = await actionsClient.execute({
          actionId: connectorId,
          signal,
          params: {
            subAction: 'sendMessage',
            subActionParams: { channel, text, ...(threadTs ? { threadTs } : {}) },
          },
        });
        if (response.status !== 'ok') {
          logger.warn(
            `Could not post the investigation limit notice to ${channel}: ${
              response.serviceMessage || response.message || 'Slack delivery failed'
            }`
          );
        }
      } catch (error) {
        logger.warn(
          `Could not post the investigation limit notice to ${channel}: ${describeError(error)}`
        );
      }
    }
  } catch (error) {
    logger.warn(`Could not post the investigation limit notice: ${describeError(error)}`);
  }
};
