/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES } from '@kbn/security-solution-plugin/common/endpoint/service/response_actions/constants';
import { indexFleetEndpointPolicy } from '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy';
import { RESPONSE_ACTIONS_AGENT_ID_PREFIX } from './cleanup';
import { seedScenario } from './endpoint_data';
import {
  buildResponseActionsScenarios,
  RESPONSE_ACTIONS_AGENT_PACKAGES,
  seedResponseActionsEndpointPolicy,
} from './response_actions_seed';

jest.mock(
  '@kbn/security-solution-plugin/common/endpoint/data_loaders/index_fleet_endpoint_policy',
  () => ({
    indexFleetEndpointPolicy: jest.fn(),
    deleteIndexedFleetEndpointPolicies: jest.fn(),
  })
);

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

  it('seeds the isolate target IP in endpoint metadata for the exact-IP eval', async () => {
    const esClient = { create: jest.fn().mockResolvedValue({}) };
    const internalEsClient = { index: jest.fn().mockResolvedValue({}) };

    await seedScenario({ esClient, internalEsClient } as never, isolate);

    const metadataCall = esClient.create.mock.calls.find(
      ([args]) => args.index === 'metrics-endpoint.metadata-default'
    );
    expect(metadataCall?.[0].document.host.ip).toEqual(['10.42.0.15']);
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

describe('seedResponseActionsEndpointPolicy failure cleanup', () => {
  const RUN_ID = 'run-1';
  const AGENT_POLICY_NAME = `eval-agent-era-agent-policy-${RUN_ID}`;

  const createLog = () =>
    ({ error: jest.fn(), warning: jest.fn(), info: jest.fn(), debug: jest.fn() } as never);

  // A Fleet that lists the leaked agent policy by name and records every delete.
  const createKbnClient = (leakedAgentPolicyIds: string[]) => {
    const deletes: Array<{ path: string; body: unknown }> = [];
    const request = jest.fn(
      async ({ path, method, body }: { path: string; method: string; body?: unknown }) => {
        if (method === 'GET' && path.includes('agent_policies')) {
          return { data: { items: leakedAgentPolicyIds.map((id) => ({ id })) } };
        }
        if (method === 'GET') {
          return { data: { items: [] } };
        }
        deletes.push({ path, body });
        return { data: {} };
      }
    );
    return { kbnClient: { request } as never, deletes };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes the agent policy the loader created before it threw, then rethrows', async () => {
    const loaderError = new Error('package policy creation timed out');
    (indexFleetEndpointPolicy as jest.Mock).mockRejectedValue(loaderError);
    const { kbnClient, deletes } = createKbnClient(['leaked-agent-policy-id']);

    await expect(
      seedResponseActionsEndpointPolicy({ kbnClient, log: createLog(), runId: RUN_ID })
    ).rejects.toBe(loaderError);

    expect(indexFleetEndpointPolicy).toHaveBeenCalledWith(
      kbnClient,
      `eval-agent-era-package-policy-${RUN_ID}`,
      undefined,
      AGENT_POLICY_NAME,
      expect.anything()
    );
    expect(deletes).toContainEqual({
      path: expect.stringContaining('agent_policies'),
      body: { agentPolicyId: 'leaked-agent-policy-id', force: true },
    });
  });

  it('still rethrows the loader error when the cleanup itself cannot reach Fleet', async () => {
    const loaderError = new Error('package policy creation timed out');
    (indexFleetEndpointPolicy as jest.Mock).mockRejectedValue(loaderError);
    const kbnClient = { request: jest.fn().mockRejectedValue(new Error('fleet down')) } as never;

    await expect(
      seedResponseActionsEndpointPolicy({ kbnClient, log: createLog(), runId: RUN_ID })
    ).rejects.toBe(loaderError);
  });

  it('does not delete anything when the loader succeeds', async () => {
    (indexFleetEndpointPolicy as jest.Mock).mockResolvedValue({
      agentPolicies: [{ id: 'ap-1' }],
      integrationPolicies: [{ id: 'pp-1' }],
    });
    const { kbnClient, deletes } = createKbnClient(['ap-1']);

    const seeded = await seedResponseActionsEndpointPolicy({
      kbnClient,
      log: createLog(),
      runId: RUN_ID,
    });

    expect(seeded.agentPolicyId).toBe('ap-1');
    expect(deletes).toEqual([]);
  });
});
