/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import type { AgentStatusRecords } from '../../../../common/endpoint/types';
import { agentStatusMocks } from '../../../../common/endpoint/service/response_actions/mocks/agent_status.mocks';
import type { AgentStatusClientInterface } from '..';

const createClientMock = (
  agentType: ResponseActionAgentType = 'endpoint'
): jest.Mocked<AgentStatusClientInterface> => {
  return {
    getAgentStatuses: jest.fn(async (agentIds) => {
      return agentIds.reduce<AgentStatusRecords>((acc, agentId) => {
        acc[agentId] = agentStatusMocks.generateAgentStatus({ agentId, agentType });
        return acc;
      }, {});
    }),
  };
};

export const agentServiceMocks = Object.freeze({
  ...agentStatusMocks,
  createClient: createClientMock,
});
