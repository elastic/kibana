/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import type { InvestigationQuotaCallback } from '../types';
import { createSlackTurnAdmissionCheck } from './slack_turn_admission';

const createLogger = () => ({ warn: jest.fn() } as unknown as Logger);

const admit = (agentId: string, callback?: InvestigationQuotaCallback) =>
  createSlackTurnAdmissionCheck({ getQuotaCallback: () => callback, logger: createLogger() })({
    origin: { type: ConversationOriginType.Slack, external_conversation_id: 'slack:T1:C1:1.1' },
    spaceId: 'default',
    request: {} as KibanaRequest,
    agentId,
  });

describe('createSlackTurnAdmissionCheck', () => {
  it.each([NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID])(
    'charges the investigation quota for a new %s conversation',
    async (agentId) => {
      const callback = jest.fn().mockResolvedValue({ allowed: true });

      await expect(admit(agentId, callback)).resolves.toBeUndefined();
      expect(callback).toHaveBeenCalledTimes(1);
    }
  );

  it('refuses with 429 when the quota is exhausted', async () => {
    const callback = jest.fn().mockResolvedValue({ allowed: false });

    const error = await admit(NIGHTSHIFT_ASSISTANT_AGENT_ID, callback).catch((e) => e);

    expect(isBoom(error) && error.output.statusCode).toBe(429);
    expect(error.message).toBe('The daily investigation limit has been reached');
  });

  it('does not charge turns for other agents', async () => {
    const callback = jest.fn().mockResolvedValue({ allowed: false });

    await expect(admit('elastic-ai-agent', callback)).resolves.toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it('admits when no quota callback is registered', async () => {
    await expect(admit(NIGHTSHIFT_ASSISTANT_AGENT_ID)).resolves.toBeUndefined();
  });
});
