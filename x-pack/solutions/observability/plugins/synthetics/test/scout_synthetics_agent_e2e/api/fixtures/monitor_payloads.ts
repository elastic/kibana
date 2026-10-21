/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorType } from './wait_for_check';
import type { AgentStack } from './agent_stack';

const schedule = { number: '1', unit: 'm' } as const;

export const BROWSER_STEP_NAME = 'visit target';

export const FAIL_PATH = '/fail';

export const buildMonitorPayload = (
  type: SyntheticsMonitorType,
  stack: AgentStack
): Record<string, unknown> => {
  const { privateLocation, target } = stack;
  const shared = {
    name: `agent-e2e-${type}-${stack.runId}`,
    enabled: true,
    locations: [privateLocation],
    schedule,
    retest_on_failure: false,
    max_attempts: 1,
  };

  switch (type) {
    case 'http':
      return { ...shared, type: 'http', url: target.url };
    case 'tcp':
      return { ...shared, type: 'tcp', host: target.host };
    case 'icmp':
      // Ping the Docker host, not loopback inside the agent container.
      return { ...shared, type: 'icmp', host: 'host.docker.internal' };
    case 'browser':
      return {
        ...shared,
        type: 'browser',
        inline_script: `step("${BROWSER_STEP_NAME}", async () => { const response = await page.goto('${target.url}'); if (!response || response.status() >= 400) { throw new Error('unexpected status ' + response?.status()); } });`,
      };
  }
};

export const buildDownHttpMonitorPayload = (stack: AgentStack): Record<string, unknown> => ({
  ...buildMonitorPayload('http', stack),
  name: `agent-e2e-http-down-${stack.runId}`,
  url: `${stack.target.url}${FAIL_PATH}`,
});
