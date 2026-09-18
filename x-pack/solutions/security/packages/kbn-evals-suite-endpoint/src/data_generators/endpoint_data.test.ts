/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { seedScenario } from './endpoint_data';

interface RequestCall {
  method: string;
  path: string;
  body?: { package?: { name?: string; version?: string } };
}

interface CreateClientsOptions {
  /** `version` reported by `GET /api/fleet/epm/packages/endpoint`. */
  installedEndpointVersion?: string;
  /** Response body for the EPM lookup, when it should not be the happy path. */
  epmResponse?: { item: { status?: string; version?: string } };
  existingAgentPolicyId?: string;
  existingPackagePolicies?: Array<{
    id: string;
    policy_id: string;
    package?: { name?: string };
  }>;
}

const scenario = {
  agentId: 'eval-agent-ts-package-version',
  hostName: 'package-version-host',
  os: { name: 'Ubuntu', version: '22.04' },
  policyName: 'manual eval policy',
  policyStatus: 'success',
};

/**
 * The seeder talks to Fleet through `kbnClient.request`, so a path-dispatching
 * stub is enough to observe exactly which package policy it asks Fleet to
 * create.
 */
const createClients = ({
  installedEndpointVersion = '9.6.0',
  epmResponse,
  existingAgentPolicyId,
  existingPackagePolicies = [],
}: CreateClientsOptions = {}) => {
  const requests: RequestCall[] = [];

  const kbnClient = {
    request: jest.fn(async (call: RequestCall) => {
      requests.push(call);

      if (call.path === '/api/fleet/agent_policies') {
        return call.method === 'GET'
          ? {
              data: {
                items: existingAgentPolicyId
                  ? [{ id: existingAgentPolicyId, name: `eval-agent-policy-${scenario.agentId}` }]
                  : [],
              },
            }
          : { data: { item: { id: 'agent-policy-1' } } };
      }

      if (call.path === '/api/fleet/package_policies') {
        return call.method === 'GET'
          ? { data: { items: existingPackagePolicies } }
          : { data: { item: { id: 'pkg-1' } } };
      }

      if (call.path === '/api/fleet/epm/packages/endpoint') {
        return {
          data: epmResponse ?? { item: { status: 'installed', version: installedEndpointVersion } },
        };
      }

      throw new Error(`Unexpected Fleet request: ${call.method} ${call.path}`);
    }),
  };

  return {
    requests,
    clients: {
      kbnClient: kbnClient as unknown as KbnClient,
      esClient: { create: jest.fn().mockResolvedValue({}) } as unknown as Client,
      internalEsClient: { index: jest.fn().mockResolvedValue({}) } as unknown as Client,
    },
  };
};

const findPackagePolicyCreate = (requests: RequestCall[]) =>
  requests.find((r) => r.method === 'POST' && r.path === '/api/fleet/package_policies');

describe('seedScenario endpoint package policy', () => {
  it('requests the endpoint package version that is actually installed', async () => {
    // The Scout config installs `endpoint` at `latest`
    // (`evals_endpoint/stateful/classic.stateful.config.ts`), so the installed
    // version is whatever the stack ships. Asking Fleet for a version that is
    // not installed makes Fleet reject the package policy, which leaves every
    // host lookup returning `endpoint_not_found`.
    const { clients, requests } = createClients({ installedEndpointVersion: '9.7.3' });

    await seedScenario(clients, scenario);

    const created = findPackagePolicyCreate(requests);
    expect(created?.body?.package).toEqual({ name: 'endpoint', version: '9.7.3' });
  });

  it('reads the installed version from EPM instead of assuming a stack version', async () => {
    const { clients, requests } = createClients({ installedEndpointVersion: '9.8.0' });

    await seedScenario(clients, scenario);

    expect(
      requests.find((r) => r.method === 'GET' && r.path === '/api/fleet/epm/packages/endpoint')
    ).toBeDefined();
    expect(findPackagePolicyCreate(requests)?.body?.package?.version).toBe('9.8.0');
  });

  it('fails loudly when the installed endpoint package version cannot be determined', async () => {
    // Posting a package policy with an unknown version would be rejected by
    // Fleet and surface much later as a confusing `endpoint_not_found`.
    const { clients, requests } = createClients({ epmResponse: { item: { status: 'installed' } } });

    await expect(seedScenario(clients, scenario)).rejects.toThrow(
      /Could not determine the installed endpoint package version/
    );
    expect(findPackagePolicyCreate(requests)).toBeUndefined();
  });

  it('reuses an existing endpoint package policy instead of creating another one', async () => {
    const { clients, requests } = createClients({
      existingAgentPolicyId: 'agent-policy-existing',
      existingPackagePolicies: [
        { id: 'pkg-existing', policy_id: 'agent-policy-existing', package: { name: 'endpoint' } },
      ],
    });

    await seedScenario(clients, scenario);

    expect(findPackagePolicyCreate(requests)).toBeUndefined();
    expect(requests.find((r) => r.path === '/api/fleet/epm/packages/endpoint')).toBeUndefined();
  });
});
