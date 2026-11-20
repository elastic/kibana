/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBoom } from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { ConversationOriginType, isAgentBuilderError } from '@kbn/agent-builder-common';
import { NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID } from '../../common';
import type { InvestigationQuotaCallback } from '../types';
import { createSlackTurnAdmissionCheck, USER_FACING_ERROR_HEADER } from './slack_turn_admission';

const createLogger = () => ({ warn: jest.fn() } as unknown as Logger);

const admit = (agentId: string, callback?: InvestigationQuotaCallback) =>
  createSlackTurnAdmissionCheck({
    getQuotaCallback: () => callback,
    getSettingsUrl: (spaceId) => `https://kibana.example/s/${spaceId}/app/nightshift/settings`,
    logger: createLogger(),
  })({
    origin: { type: ConversationOriginType.Slack, external_conversation_id: 'slack:T1:C1:1.1' },
    spaceId: 'default',
    request: {} as KibanaRequest,
    agentId,
  });

describe('createSlackTurnAdmissionCheck', () => {
  it.each([NIGHTSHIFT_ASSISTANT_AGENT_ID, NIGHTSHIFT_INVESTIGATION_AGENT_ID])(
    'charges the manual investigation quota for a new %s conversation and returns its release',
    async (agentId) => {
      const release = jest.fn();
      const callback = jest.fn().mockResolvedValue({ allowed: true, release });

      await expect(admit(agentId, callback)).resolves.toBe(release);
      expect(callback).toHaveBeenCalledWith('manual');
    }
  );

  it.each([
    ['manual', 'The daily limit for manual investigations has been reached'],
    ['all', 'The daily limit for all investigations has been reached'],
  ] as const)(
    'refuses with a user-facing 429 when the %s limit is reached',
    async (deniedBy, reached) => {
      const callback = jest.fn().mockResolvedValue({ allowed: false, deniedBy });

      const error = await admit(NIGHTSHIFT_ASSISTANT_AGENT_ID, callback).catch((e) => e);

      expect(isBoom(error) && error.output.statusCode).toBe(429);
      expect(error.output.headers[USER_FACING_ERROR_HEADER]).toBe('true');
      expect(error.message).toBe(
        `${reached}. An admin can raise it in [Nightshift settings](https://kibana.example/s/default/app/nightshift/settings).`
      );
    }
  );

  it('names the value of the limit that was reached', async () => {
    const callback = jest.fn().mockResolvedValue({ allowed: false, deniedBy: 'all', limit: 10 });

    const error = await admit(NIGHTSHIFT_ASSISTANT_AGENT_ID, callback).catch((e) => e);

    expect(error.message).toBe(
      'The daily limit of 10 for all investigations has been reached. An admin can raise it in [Nightshift settings](https://kibana.example/s/default/app/nightshift/settings).'
    );
  });

  it('does not charge turns for other agents', async () => {
    const callback = jest.fn().mockResolvedValue({ allowed: false });

    await expect(admit('elastic-ai-agent', callback)).resolves.toBeUndefined();
    expect(callback).not.toHaveBeenCalled();
  });

  it('refuses with a 503 Agent Builder error when the quota check is unavailable', async () => {
    const error = await admit(NIGHTSHIFT_ASSISTANT_AGENT_ID).catch((e) => e);

    expect(isAgentBuilderError(error) && error.meta.statusCode).toBe(503);
  });
});
