/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
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
