/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tooManyRequests } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { ConversationOriginType, createInternalError } from '@kbn/agent-builder-common';
import type { OnBeforeNewConversationHook } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { evaluateInvestigationQuota } from '../client/evaluate_investigation_quota';
import { InvestigationQuotaDeniedError, InvestigationUnavailableError } from '../client/errors';
import type { InvestigationQuotaCallback, InvestigationQuotaLimit } from '../types';

const SLACK_AGENT_IDS: ReadonlySet<string> = new Set([
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
]);

/**
 * Marks a refusal whose message is meant for the person in the external conversation. Relay posts
 * that message in the Slack thread instead of retrying the turn.
 */
export const USER_FACING_ERROR_HEADER = 'x-elastic-user-facing-error';

/**
 * Markdown, which Relay renders in the Slack thread. Readers may lack the privilege to change
 * settings, so the text addresses an admin.
 */
export const getLimitReachedMessage = (
  deniedBy: InvestigationQuotaLimit,
  settingsUrl?: string,
  limit?: number
): string => {
  const reached = new InvestigationQuotaDeniedError(deniedBy, limit).message;
  return settingsUrl
    ? `${reached}. An admin can raise it in [nightshift settings](${settingsUrl}).`
    : `${reached}. An admin can raise it in the nightshift settings.`;
};

/**
 * Charges the daily manual investigation quota for a Slack mention of a Nightshift agent that
 * opens a new conversation, and gives the slot back when the turn writes no conversation. A
 * mention in a thread that already has a conversation is not charged.
 */
export const createSlackTurnAdmissionCheck =
  ({
    getQuotaCallback,
    getSettingsUrl,
    logger,
  }: {
    getQuotaCallback: () => InvestigationQuotaCallback | undefined;
    /** The absolute Nightshift settings URL in a space, when it can be built. */
    getSettingsUrl: (spaceId: string) => string | undefined;
    logger: Logger;
  }): OnBeforeNewConversationHook =>
  async ({ origin, agentId, spaceId }) => {
    if (origin.type !== ConversationOriginType.Slack || !SLACK_AGENT_IDS.has(agentId)) {
      return;
    }

    const { allowed, deniedBy, limit, release } = await evaluateInvestigationQuota({
      callback: getQuotaCallback(),
      trigger: 'manual',
      logger,
    }).catch((error) => {
      // Agent Builder's routes keep the status of its own errors but turn a 5xx Boom into a 500.
      throw error instanceof InvestigationUnavailableError
        ? createInternalError(error.message, { statusCode: 503 })
        : error;
    });
    if (!allowed) {
      const refusal = tooManyRequests(
        getLimitReachedMessage(deniedBy ?? 'manual', getSettingsUrl(spaceId), limit)
      );
      refusal.output.headers[USER_FACING_ERROR_HEADER] = 'true';
      throw refusal;
    }
    return release;
  };
