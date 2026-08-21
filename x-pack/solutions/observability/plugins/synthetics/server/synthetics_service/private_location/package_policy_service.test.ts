/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AgentPolicy, UpdatePackagePolicyWithId } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicyWithId } from '@kbn/fleet-plugin/server/services/package_policy';
import { PackagePolicyService } from './package_policy_service';
import type { SyntheticsServerSetup } from '../../types';

// The space-scoped SO client is opaque here; we tag it with the namespace it was
// scoped to so we can assert which space a package policy was written into.
const makeServer = () => {
  const asScopedToNamespace = jest.fn((space: string) => ({ __space: space }));
  const getUnsafeInternalClient = jest.fn(() => ({ asScopedToNamespace }));
  const fleetBulkCreate = jest.fn().mockResolvedValue({ created: [], failed: [] });
  const getByIds = jest.fn();

  const server = {
    logger: loggerMock.create(),
    fleet: {
      packagePolicyService: { bulkCreate: fleetBulkCreate },
      agentPolicyService: { getByIds },
    },
    coreStart: {
      savedObjects: { getUnsafeInternalClient },
      elasticsearch: { client: { asInternalUser: { __es: true } } },
    },
  } as unknown as SyntheticsServerSetup;

  return { server, asScopedToNamespace, fleetBulkCreate, getByIds };
};

const policy = (overrides: Partial<NewPackagePolicyWithId> = {}): NewPackagePolicyWithId =>
  ({ id: 'testId-policyId', policy_ids: ['policyId'], ...overrides } as NewPackagePolicyWithId);

const agentPolicy = (spaceIds?: string[]): AgentPolicy =>
  ({ id: 'policyId', space_ids: spaceIds } as AgentPolicy);

describe('PackagePolicyService.getDefaultAndSpacePackagePolicies (via bulkCreate)', () => {
  const clientPassedToFleet = (fleetBulkCreate: jest.Mock) => fleetBulkCreate.mock.calls[0][0];

  it('writes the package policy to the DEFAULT space when the agent policy lives in default and the monitor is in another space', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([agentPolicy(['default'])]);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: 'naims',
    });

    expect(fleetBulkCreate).toHaveBeenCalledTimes(1);
    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: DEFAULT_SPACE_ID });
  });

  it('writes the package policy to the monitor space when the agent policy is assigned to that space', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([agentPolicy(['naims'])]);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: 'naims',
    });

    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: 'naims' });
  });

  it('writes the package policy to the monitor space when the agent policy is all-spaces', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([agentPolicy([ALL_SPACES_ID])]);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: 'naims',
    });

    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: 'naims' });
  });

  it('falls back to the DEFAULT space when the agent policy cannot be found', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([]);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: 'naims',
    });

    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: DEFAULT_SPACE_ID });
  });

  it('short-circuits to the DEFAULT-space client without fetching agent policies when the monitor is in the default space', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(getByIds).not.toHaveBeenCalled();
    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: DEFAULT_SPACE_ID });
  });
});

describe('PackagePolicyService.listByAgentPolicy', () => {
  const makeListServer = (pages: Array<Array<{ id: string }>>) => {
    const list = jest.fn(async (_soClient: unknown, { page }: { page: number }) => ({
      items: pages[page - 1] ?? [],
    }));
    const server = {
      logger: loggerMock.create(),
      fleet: { packagePolicyService: { list } },
      coreStart: { savedObjects: { createInternalRepository: () => ({}) } },
    } as unknown as SyntheticsServerSetup;
    return { server, list };
  };

  it('queries synthetics policies bound to the agent policy across all spaces', async () => {
    const { server, list } = makeListServer([[{ id: 'm1-loc' }]]);

    const result = await new PackagePolicyService(server).listByAgentPolicy({
      agentPolicyId: 'ap-1',
    });

    expect(result).toEqual([{ id: 'm1-loc' }]);
    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        spaceId: ALL_SPACES_ID,
        kuery:
          'ingest-package-policies.package.name:synthetics AND ingest-package-policies.policy_ids:"ap-1"',
      })
    );
  });

  it('paginates until a short page and concatenates the results', async () => {
    const fullPage = Array.from({ length: 1000 }, (_, i) => ({ id: `m${i}-loc` }));
    const { server, list } = makeListServer([fullPage, [{ id: 'last-loc' }]]);

    const result = await new PackagePolicyService(server).listByAgentPolicy({
      agentPolicyId: 'ap-1',
    });

    expect(result).toHaveLength(1001);
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('PackagePolicyService.bulkUpdateInSpace', () => {
  const makeUpdateServer = () => {
    const asScopedToNamespace = jest.fn((space: string) => ({ __space: space }));
    const bulkUpdate = jest.fn().mockResolvedValue({ failedPolicies: [] });
    const getByIds = jest.fn();
    const server = {
      logger: loggerMock.create(),
      fleet: { packagePolicyService: { bulkUpdate }, agentPolicyService: { getByIds } },
      coreStart: {
        savedObjects: { getUnsafeInternalClient: () => ({ asScopedToNamespace }) },
        elasticsearch: { client: { asInternalUser: { __es: true } } },
      },
    } as unknown as SyntheticsServerSetup;
    return { server, bulkUpdate, getByIds, asScopedToNamespace };
  };

  const update = (id: string): UpdatePackagePolicyWithId =>
    ({ id, policy_ids: ['ap-1'] } as UpdatePackagePolicyWithId);

  it('writes directly to the policy own space without deriving routing from the agent policy', async () => {
    const { server, bulkUpdate, getByIds } = makeUpdateServer();

    await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc')],
      spaceId: 'team-x',
    });

    // No agent-policy lookup (the create/edit routing is bypassed).
    expect(getByIds).not.toHaveBeenCalled();
    // Client scoped straight to the policy's own space.
    expect(bulkUpdate.mock.calls[0][0]).toEqual({ __space: 'team-x' });
    expect(bulkUpdate.mock.calls[0][2]).toEqual([update('m1-loc')]);
  });

  it('maps ALL_SPACES to the default space (a valid namespace for an all-spaces policy)', async () => {
    const { server, bulkUpdate } = makeUpdateServer();

    await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc')],
      spaceId: ALL_SPACES_ID,
    });

    expect(bulkUpdate.mock.calls[0][0]).toEqual({ __space: DEFAULT_SPACE_ID });
  });

  it('is a no-op for an empty update list', async () => {
    const { server, bulkUpdate } = makeUpdateServer();

    const failed = await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [],
      spaceId: 'team-x',
    });

    expect(failed).toEqual([]);
    expect(bulkUpdate).not.toHaveBeenCalled();
  });
});
