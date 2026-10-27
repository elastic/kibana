/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tooManyRequests } from '@hapi/boom';
import type { Logger } from '@kbn/core/server';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { CallbackAdmissionCheck } from '@kbn/agent-builder-server';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import { evaluateInvestigationQuota } from '../client/evaluate_investigation_quota';
import { InvestigationQuotaDeniedError } from '../client/errors';
import type { InvestigationQuotaCallback } from '../types';

const SLACK_AGENT_IDS: ReadonlySet<string> = new Set([
  NIGHTSHIFT_ASSISTANT_AGENT_ID,
  NIGHTSHIFT_INVESTIGATION_AGENT_ID,
]);

/**
 * Charges the daily automatic investigation quota for a Slack mention of a Nightshift agent that
 * opens a new conversation. A mention in a thread that already has a conversation is not charged.
 */
export const createSlackTurnAdmissionCheck =
  ({
    getQuotaCallback,
    logger,
  }: {
    getQuotaCallback: () => InvestigationQuotaCallback | undefined;
    logger: Logger;
  }): CallbackAdmissionCheck =>
  async ({ origin, agentId }) => {
    if (origin.type !== ConversationOriginType.Slack || !SLACK_AGENT_IDS.has(agentId)) {
      return;
    }

    const { allowed } = await evaluateInvestigationQuota({
      callback: getQuotaCallback(),
      logger,
    });
    if (!allowed) {
      throw tooManyRequests(new InvestigationQuotaDeniedError().message);
    }
  };
