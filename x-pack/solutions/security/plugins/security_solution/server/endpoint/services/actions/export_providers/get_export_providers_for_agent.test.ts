/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockEndpointAppContextService } from '../../../mocks';
import { getExportProvidersForAgent } from './get_export_providers_for_agent';
import { EndpointMetadataGenerator } from '../../../../../common/endpoint/data_generators/endpoint_metadata_generator';
import { FleetAgentGenerator } from '../../../../../common/endpoint/data_generators/fleet_agent_generator';
import { FleetPackagePolicyGenerator } from '../../../../../common/endpoint/data_generators/fleet_package_policy_generator';
import { setExportProviders } from '../../../../../common/endpoint/models/export_providers';
import { EndpointHostNotFoundError } from '../../metadata';
import { NotFoundError } from '../../../errors';
import type { ExportProvider } from '../../../../../common/endpoint/types';

const SPACE_ID = 'default';
const AGENT_ID = 'fleet-agent-1';
const AGENT_POLICY_ID = 'agent-policy-1';

describe('getExportProvidersForAgent()', () => {
  let endpointServiceMock: ReturnType<typeof createMockEndpointAppContextService>;
  let getMetadataForEndpointsMock: jest.Mock;
  let fetchAgentsByIdMock: jest.Mock;
  let packagePolicyListMock: jest.Mock;

  const callService = (agentId: string = AGENT_ID) =>
    getExportProvidersForAgent({
      endpointService: endpointServiceMock,
      spaceId: SPACE_ID,
      agentId,
    });

  beforeEach(() => {
    endpointServiceMock = createMockEndpointAppContextService();

    getMetadataForEndpointsMock = jest.fn().mockResolvedValue([
      new EndpointMetadataGenerator('seed').generate({
        elastic: { agent: { id: AGENT_ID } },
      }),
    ]);
    (endpointServiceMock.getEndpointMetadataService as jest.Mock).mockReturnValue({
      getMetadataForEndpoints: getMetadataForEndpointsMock,
    });

    const fleetServices = endpointServiceMock.getInternalFleetServices(SPACE_ID);

    fetchAgentsByIdMock = fleetServices.fetchAgentsById as jest.Mock;
    fetchAgentsByIdMock.mockResolvedValue([
      new FleetAgentGenerator('seed').generate({ id: AGENT_ID, policy_id: AGENT_POLICY_ID }),
    ]);

    packagePolicyListMock = fleetServices.packagePolicy.list as jest.Mock;
    packagePolicyListMock.mockResolvedValue({
      items: [
        new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
          policy_ids: [AGENT_POLICY_ID],
        }),
      ],
      page: 1,
      perPage: 10_000,
      total: 1,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('resolves through the Fleet-assigned integration policy, not the Endpoint `policy.applied` one', async () => {
    const provider: ExportProvider = {
      id: 'azure-1',
      type: 'azure_blob',
      account_name: 'acct',
      container: 'dumps',
    };
    const assignedPolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      id: 'assigned-policy',
      policy_ids: [AGENT_POLICY_ID],
    });
    assignedPolicy.inputs[0].config.policy.value = setExportProviders(
      assignedPolicy.inputs[0].config.policy.value,
      [provider]
    );
    packagePolicyListMock.mockResolvedValue({
      items: [assignedPolicy],
      page: 1,
      perPage: 10_000,
      total: 1,
    });
    // `Endpoint.policy.applied.id` points at a different (Policy Management) policy id than the
    // one Fleet actually assigned the agent to; the Fleet assignment must win.
    getMetadataForEndpointsMock.mockResolvedValue([
      new EndpointMetadataGenerator('seed').generate({
        elastic: { agent: { id: AGENT_ID } },
        Endpoint: { policy: { applied: { id: 'policy-management-policy-id' } } },
      }),
    ]);

    await expect(callService()).resolves.toEqual([provider]);
  });

  it('selects the package policy whose `policy_ids` includes the agent `policy_id`, out of several candidates', async () => {
    const provider: ExportProvider = {
      id: 'azure-1',
      type: 'azure_blob',
      account_name: 'acct',
      container: 'dumps',
    };
    const matchingPolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      id: 'matching-policy',
      policy_ids: [AGENT_POLICY_ID],
    });
    matchingPolicy.inputs[0].config.policy.value = setExportProviders(
      matchingPolicy.inputs[0].config.policy.value,
      [provider]
    );
    const otherPolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      id: 'other-policy',
      policy_ids: ['some-other-agent-policy'],
    });

    packagePolicyListMock.mockResolvedValue({
      items: [otherPolicy, matchingPolicy],
      page: 1,
      perPage: 10_000,
      total: 2,
    });

    await expect(callService()).resolves.toEqual([provider]);
  });

  it('ignores a non-Elastic Defend package policy attached to the same agent policy', async () => {
    const osqueryPolicy = new FleetPackagePolicyGenerator('seed').generate({
      id: 'osquery-policy',
      policy_ids: [AGENT_POLICY_ID],
      package: { name: 'osquery_manager', title: 'Osquery Manager', version: '1.0.0' },
    });
    const endpointPolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      id: 'endpoint-policy',
      policy_ids: [AGENT_POLICY_ID],
    });
    endpointPolicy.inputs[0].config.policy.value = setExportProviders(
      endpointPolicy.inputs[0].config.policy.value,
      [{ id: 'azure-1', type: 'azure_blob', account_name: 'acct', container: 'dumps' }]
    );
    packagePolicyListMock.mockResolvedValue({
      items: [osqueryPolicy, endpointPolicy],
      page: 1,
      perPage: 10_000,
      total: 2,
    });

    await expect(callService()).resolves.toEqual([
      { id: 'azure-1', type: 'azure_blob', account_name: 'acct', container: 'dumps' },
    ]);
  });

  it('rejects with EndpointHostNotFoundError for an unknown agent', async () => {
    getMetadataForEndpointsMock.mockResolvedValue([]);

    await expect(callService()).rejects.toBeInstanceOf(EndpointHostNotFoundError);
  });

  it('propagates the NotFoundError thrown when the agent is enrolled in another space', async () => {
    const spaceError = new NotFoundError(`Agent ID(s) not found: [${AGENT_ID}]`);
    getMetadataForEndpointsMock.mockRejectedValue(spaceError);

    await expect(callService()).rejects.toBe(spaceError);
  });

  it('rejects with NotFoundError when the Fleet agent has no `policy_id`', async () => {
    const agentWithoutPolicy = new FleetAgentGenerator('seed').generate({ id: AGENT_ID });
    delete agentWithoutPolicy.policy_id;
    fetchAgentsByIdMock.mockResolvedValue([agentWithoutPolicy]);

    await expect(callService()).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejects with NotFoundError when no Elastic Defend integration policy matches the agent policy', async () => {
    packagePolicyListMock.mockResolvedValue({ items: [], page: 1, perPage: 10_000, total: 0 });

    await expect(callService()).rejects.toBeInstanceOf(NotFoundError);
  });

  it('returns an empty array when the policy has no export providers', async () => {
    await expect(callService()).resolves.toEqual([]);
  });

  it('returns the full provider entries, including `service_url`', async () => {
    const provider: ExportProvider = {
      id: 'azure-1',
      type: 'azure_blob',
      account_name: 'acct',
      container: 'dumps',
      service_url: 'https://acct.blob.core.windows.net',
    };
    const packagePolicy = new FleetPackagePolicyGenerator('seed').generateEndpointPackagePolicy({
      policy_ids: [AGENT_POLICY_ID],
    });
    packagePolicy.inputs[0].config.policy.value = setExportProviders(
      packagePolicy.inputs[0].config.policy.value,
      [provider]
    );
    packagePolicyListMock.mockResolvedValue({
      items: [packagePolicy],
      page: 1,
      perPage: 10_000,
      total: 1,
    });

    await expect(callService()).resolves.toEqual([provider]);
  });
});
