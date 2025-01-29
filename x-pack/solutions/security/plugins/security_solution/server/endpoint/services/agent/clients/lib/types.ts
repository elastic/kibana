/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentStatusRecords } from '../../../../../../common/endpoint/types';

export interface AgentStatusClientInterface {
  getAgentStatuses: (agentIds: string[]) => Promise<AgentStatusRecords>;
}
