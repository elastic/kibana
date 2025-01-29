/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import type { DeepPartial } from 'utility-types';
import type { AgentStatusRecords, AgentStatusApiResponse, AgentStatusInfo } from '../../../types';
import { HostStatus } from '../../../types';

const generateAgentStatusMock = (overrides: DeepPartial<AgentStatusInfo> = {}): AgentStatusInfo => {
  return merge(
    {
      agentId: 'abfe4a35-d5b4-42a0-a539-bd054c791769',
      agentType: 'endpoint',
      found: true,
      isolated: false,
      lastSeen: new Date().toISOString(),
      pendingActions: {},
      status: HostStatus.HEALTHY,
    },
    overrides
  ) as AgentStatusInfo;
};

const generateAgentStatusRecordsMock = (
  overrides: DeepPartial<AgentStatusRecords> = {}
): AgentStatusRecords => {
  return merge(
    { 'abfe4a35-d5b4-42a0-a539-bd054c791769': generateAgentStatusMock() },
    overrides
  ) as AgentStatusRecords;
};

const generateAgentStatusApiResponseMock = (
  overrides: DeepPartial<AgentStatusApiResponse> = {}
): AgentStatusApiResponse => {
  return merge({ data: generateAgentStatusRecordsMock() }, overrides);
};

export const agentStatusMocks = Object.freeze({
  generateAgentStatus: generateAgentStatusMock,
  generateAgentStatusRecords: generateAgentStatusRecordsMock,
  generateAgentStatusApiResponse: generateAgentStatusApiResponseMock,
});
