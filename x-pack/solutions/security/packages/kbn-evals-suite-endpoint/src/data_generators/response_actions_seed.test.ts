/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTIONS_AGENT_ID_PREFIX } from './cleanup';
import { seedScenario } from './endpoint_data';
import {
  buildResponseActionsScenarios,
  RESPONSE_ACTIONS_AGENT_PACKAGES,
} from './response_actions_seed';

const AGENT_POLICY_ID = 'agent-policy-with-endpoint-package-policy';

describe('response actions seed', () => {
  const { isolate, release } = buildResponseActionsScenarios(AGENT_POLICY_ID);

  it.each([
    ['isolate', isolate],
    ['release', release],
  ])('%s host is enrolled on the endpoint package policy agent policy', (_name, scenario) => {
    // getHostMetadataList filters on united.agent.policy_id IN <agent policies of endpoint package policies>
    expect(scenario.policyId).toBe(AGENT_POLICY_ID);
  });

  it.each([
    ['isolate', isolate],
    ['release', release],
  ])('%s host carries a package the endpoint_lookup filter keeps', (_name, scenario) => {
    // endpoint_lookup drops Fleet agents without a package in RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES
    const supported = new Set(Object.values(RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES).flat());
    expect((scenario.agentPackages ?? []).some((pkg) => supported.has(pkg))).toBe(true);
  });

  it('uses ids inside the suite namespace that cleanup deletes', () => {
    expect(isolate.agentId.startsWith(RESPONSE_ACTIONS_AGENT_ID_PREFIX)).toBe(true);
    expect(release.agentId.startsWith(RESPONSE_ACTIONS_AGENT_ID_PREFIX)).toBe(true);
  });

  it('writes policy_id and packages onto the .fleet-agents doc', async () => {
    const esClient = { create: jest.fn().mockResolvedValue({}) };
    const internalEsClient = { index: jest.fn().mockResolvedValue({}) };

    await seedScenario({ esClient, internalEsClient } as never, isolate);

    const fleetAgentCall = internalEsClient.index.mock.calls.find(
      ([args]) => args.index === '.fleet-agents'
    );
    expect(fleetAgentCall?.[0].document).toEqual(
      expect.objectContaining({
        policy_id: AGENT_POLICY_ID,
        packages: RESPONSE_ACTIONS_AGENT_PACKAGES,
      })
    );
    expect(fleetAgentCall?.[0].id).toBe(isolate.agentId);
  });
});
