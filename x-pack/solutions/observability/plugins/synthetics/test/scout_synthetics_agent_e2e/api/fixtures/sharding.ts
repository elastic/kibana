/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '../../../scout/common/fixtures';
import { startAgentStack, type AgentStack } from './agent_stack';

export interface ShardingAgentE2eWorkerFixtures {
  agentStack: AgentStack;
}

/**
 * Two lightweight `elastic-agent` enrollments on one scalable private location.
 * Browser journeys are out of scope — HTTP is enough to prove rebalance
 * failover, data-plane veto, and recovery against real Heartbeat.
 */
export const apiTest = baseApiTest.extend<{}, ShardingAgentE2eWorkerFixtures>({
  agentStack: [
    async ({ apiServices, kbnClient, config, log }, use, workerInfo) => {
      const runId = `shard-w${workerInfo.workerIndex}-${process.pid}`;
      const { stack, stop } = await startAgentStack({
        apiServices,
        kbnClient,
        config,
        log,
        runId,
        agentCount: 2,
        agentImage: 'agent',
        isAgentSharding: true,
      });
      await use(stack);
      await stop();
    },
    { scope: 'worker', timeout: 50 * 60 * 1000 },
  ],
});
