/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest } from '../../../scout/common/fixtures';
import { startAgentStack, type AgentStack } from './agent_stack';

export interface AgentE2eWorkerFixtures {
  agentStack: AgentStack;
}

/**
 * Sequential API fixture for the real-agent suite. `agentStack` starts Fleet
 * Server + elastic-agent-complete once per worker and tears them down after.
 */
export const apiTest = baseApiTest.extend<{}, AgentE2eWorkerFixtures>({
  agentStack: [
    async ({ apiServices, kbnClient, config, log }, use, workerInfo) => {
      const runId = `w${workerInfo.workerIndex}-${process.pid}`;
      const { stack, stop } = await startAgentStack({
        apiServices,
        kbnClient,
        config,
        log,
        runId,
      });
      await use(stack);
      await stop();
    },
    { scope: 'worker', timeout: 30 * 60 * 1000 },
  ],
});

export {
  BROWSER_STEP_NAME,
  buildDownHttpMonitorPayload,
  buildMonitorPayload,
} from './monitor_payloads';
export {
  isCheckDown,
  isCheckUp,
  waitForBrowserStep,
  waitForSyntheticsCheck,
} from './wait_for_check';
export type { SyntheticsCheckDoc, SyntheticsMonitorType } from './wait_for_check';
export type { AgentStack } from './agent_stack';
