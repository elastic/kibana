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

  it('keeps every id-less Test Now policy when the monitor is in a non-default space', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([
      { id: 'policy-a', space_ids: ['naims', DEFAULT_SPACE_ID] },
      { id: 'policy-b', space_ids: ['naims', DEFAULT_SPACE_ID] },
      { id: 'policy-c', space_ids: [DEFAULT_SPACE_ID] },
    ]);
    const testNowPolicies = ['policy-a', 'policy-b', 'policy-c'].map((policyId) =>
      policy({ id: undefined, name: 'BROWSER_SYNTHETICS_TEST_NOW_RUN', policy_ids: [policyId] })
    );

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: testNowPolicies,
      spaceId: 'naims',
    });

    const policiesByClient = fleetBulkCreate.mock.calls.map(([client, , policies]) => ({
      client,
      policyIds: policies.map((p: NewPackagePolicyWithId) => p.policy_ids),
    }));
    expect(policiesByClient).toEqual([
      { client: { __space: DEFAULT_SPACE_ID }, policyIds: [['policy-c']] },
      { client: { __space: 'naims' }, policyIds: [['policy-a'], ['policy-b']] },
    ]);
  });

  it('routes a package policy attached to several agent policies in one space only once', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();
    getByIds.mockResolvedValue([
      { id: 'policy-a', space_ids: ['naims'] },
      { id: 'policy-b', space_ids: ['naims'] },
    ]);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy({ policy_ids: ['policy-a', 'policy-b'] })],
      spaceId: 'naims',
    });

    expect(fleetBulkCreate).toHaveBeenCalledTimes(1);
    expect(fleetBulkCreate.mock.calls[0][2]).toHaveLength(1);
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

describe('PackagePolicyService deferred revision bumps', () => {
  const makeDeferralServer = () => {
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const fleetBulkCreate = jest.fn();
    const fleetBulkUpdate = jest.fn();
    const fleetDelete = jest.fn();
    const fleetGetByIDs = jest.fn();
    const agentPolicyGetByIds = jest.fn().mockResolvedValue([agentPolicy([DEFAULT_SPACE_ID])]);

    const server = {
      logger: loggerMock.create(),
      fleet: {
        packagePolicyService: {
          bulkCreate: fleetBulkCreate,
          bulkUpdate: fleetBulkUpdate,
          delete: fleetDelete,
          getByIDs: fleetGetByIDs,
        },
        agentPolicyService: { getByIds: agentPolicyGetByIds, bumpRevision },
      },
      coreStart: {
        savedObjects: {
          getUnsafeInternalClient: () => ({ asScopedToNamespace: (space: string) => ({ space }) }),
          createInternalRepository: () => ({ __repository: true }),
        },
        elasticsearch: { client: { asInternalUser: { __es: true } } },
      },
    } as unknown as SyntheticsServerSetup;

    return { server, bumpRevision, fleetBulkCreate, fleetBulkUpdate, fleetDelete, fleetGetByIDs };
  };

  it('collects agent policy ids instead of bumping per write, then bumps each once', async () => {
    const { server, fleetBulkUpdate, bumpRevision } = makeDeferralServer();
    fleetBulkUpdate.mockImplementation(async (_client, _es, policies) => ({
      updatedPolicies: policies,
      failedPolicies: [],
    }));
    const service = new PackagePolicyService(server);
    const deferredBumps = new Set<string>();

    for (const id of ['monitor-1-policyId', 'monitor-2-policyId']) {
      await service.bulkUpdate({
        policiesToUpdate: [{ ...policy({ id }), id } as never],
        spaceId: DEFAULT_SPACE_ID,
        deferredBumps,
      });
    }

    expect(fleetBulkUpdate).toHaveBeenCalledTimes(2);
    expect(fleetBulkUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ bumpRevision: false })
    );
    expect(deferredBumps).toEqual(new Set(['policyId']));
    expect(bumpRevision).not.toHaveBeenCalled();

    await service.scheduleRevisionBumps(deferredBumps);

    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'policyId', {
      asyncDeploy: true,
    });
    expect(deferredBumps.size).toBe(0);
  });

  it('leaves Fleet to bump when no deferredBumps set is passed', async () => {
    const { server, fleetBulkUpdate } = makeDeferralServer();
    fleetBulkUpdate.mockResolvedValue({ updatedPolicies: [], failedPolicies: [] });

    await new PackagePolicyService(server).bulkUpdate({
      policiesToUpdate: [policy() as never],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(fleetBulkUpdate.mock.calls[0][3]).not.toHaveProperty('bumpRevision');
  });

  it('defers creates and deletes too', async () => {
    const { server, fleetBulkCreate, fleetDelete, fleetGetByIDs, bumpRevision } =
      makeDeferralServer();
    const created = policy({ id: 'monitor-1-policyId' });
    const deleted = policy({ id: 'monitor-2-policyId' });
    fleetBulkCreate.mockResolvedValue({ created: [created], failed: [] });
    fleetGetByIDs.mockResolvedValue([deleted]);
    fleetDelete.mockResolvedValue([
      { id: deleted.id, success: true, policy_ids: ['otherPolicyId'] },
      { id: 'failed', success: false, policy_ids: ['ignoredPolicyId'] },
    ]);
    const service = new PackagePolicyService(server);
    const deferredBumps = new Set<string>();

    await service.bulkCreate({ newPolicies: [created], spaceId: DEFAULT_SPACE_ID, deferredBumps });
    await service.bulkDelete({
      policyIdsToDelete: [deleted.id as string],
      spaceId: DEFAULT_SPACE_ID,
      deferredBumps,
    });

    expect(fleetBulkCreate.mock.calls[0][3]).toEqual(
      expect.objectContaining({ bumpRevision: false })
    );
    expect(fleetDelete.mock.calls[0][3]).toEqual(expect.objectContaining({ bumpRevision: false }));
    expect(deferredBumps).toEqual(new Set(['policyId', 'otherPolicyId']));
    expect(bumpRevision).not.toHaveBeenCalled();
  });

  it('does nothing when no bumps were collected', async () => {
    const { server, bumpRevision } = makeDeferralServer();

    await new PackagePolicyService(server).scheduleRevisionBumps(new Set());

    expect(bumpRevision).not.toHaveBeenCalled();
  });

  it('attempts every bump and rethrows the first failure', async () => {
    const { server, bumpRevision } = makeDeferralServer();
    bumpRevision.mockRejectedValueOnce(new Error('bump failed')).mockResolvedValueOnce(undefined);

    await expect(
      new PackagePolicyService(server).scheduleRevisionBumps(new Set(['a', 'b']))
    ).rejects.toThrow('bump failed');

    expect(bumpRevision).toHaveBeenCalledTimes(2);
  });
});
