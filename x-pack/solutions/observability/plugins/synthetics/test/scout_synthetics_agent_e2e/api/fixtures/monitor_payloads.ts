/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsMonitorType } from './wait_for_check';
import type { AgentStack } from './agent_stack';

const schedule = { number: '1', unit: 'm' } as const;

export const buildMonitorPayload = (
  type: SyntheticsMonitorType,
  { privateLocation, target }: AgentStack
): Record<string, unknown> => {
  const shared = {
    name: `agent-e2e-${type}`,
    enabled: true,
    locations: [privateLocation],
    schedule,
    retest_on_failure: false,
  };

  switch (type) {
    case 'http':
      return { ...shared, type: 'http', url: target.url };
    case 'tcp':
      return { ...shared, type: 'tcp', host: target.host };
    case 'icmp':
      return { ...shared, type: 'icmp', host: '127.0.0.1' };
    case 'browser':
      return {
        ...shared,
        type: 'browser',
        inline_script: `step("visit target", async () => { const response = await page.goto('${target.url}'); if (!response || response.status() >= 400) { throw new Error('unexpected status ' + response?.status()); } });`,
      };
  }
};
