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
import { PackagePolicyService, bumpAgentPolicyRevision } from './package_policy_service';
import type { ConditionUpdate } from './rebalance_writes';
import { SHARDED_PACKAGE_POLICY_FIELDS } from './rebalance_writes';
import type { SyntheticsServerSetup } from '../../types';

// Fleet's debounced `agentPolicyService.scheduleRevisionBump`, shared by every server mock here.
const scheduleBumps = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  scheduleBumps.mockClear();
});

// The space-scoped SO client is opaque here; we tag it with the namespace it was
// scoped to so we can assert which space a package policy was written into.
const makeServer = () => {
  const asScopedToNamespace = jest.fn((space: string) => {
    const client = { __space: space };
    Object.defineProperty(client, 'getCurrentNamespace', { value: () => space });
    return client;
  });
  const unsafeClient = { asScopedToNamespace };
  const getUnsafeInternalClient = jest.fn(() => unsafeClient);
  const fleetBulkCreate = jest.fn().mockResolvedValue({ created: [], failed: [] });
  const fleetBulkUpdate = jest.fn().mockResolvedValue({ updatedPolicies: [], failedPolicies: [] });
  const fleetGetByIDs = jest.fn().mockResolvedValue([]);
  const fleetDelete = jest.fn().mockResolvedValue([]);
  // Serves the create/edit space routing; individual tests override as needed.
  const getByIds = jest.fn().mockResolvedValue([]);

  const server = {
    logger: loggerMock.create(),
    fleet: {
      packagePolicyService: {
        bulkCreate: fleetBulkCreate,
        bulkUpdate: fleetBulkUpdate,
        getByIDs: fleetGetByIDs,
        delete: fleetDelete,
      },
      agentPolicyService: { getByIds, scheduleRevisionBump: scheduleBumps },
    },
    coreStart: {
      savedObjects: { getUnsafeInternalClient, createInternalRepository: () => ({}) },
      elasticsearch: { client: { asInternalUser: { __es: true } } },
    },
  } as unknown as SyntheticsServerSetup;

  return {
    server,
    unsafeClient,
    asScopedToNamespace,
    getUnsafeInternalClient,
    fleetBulkCreate,
    fleetBulkUpdate,
    fleetGetByIDs,
    fleetDelete,
    getByIds,
  };
};

const policy = (overrides: Partial<NewPackagePolicyWithId> = {}): NewPackagePolicyWithId =>
  ({ id: 'testId-policyId', policy_ids: ['policyId'], ...overrides } as NewPackagePolicyWithId);

const agentPolicy = (spaceIds?: string[]): AgentPolicy =>
  ({ id: 'policyId', space_ids: spaceIds } as AgentPolicy);

describe('PackagePolicyService.getByIds', () => {
  it('uses one unscoped bulk get across unique spaces and forwards requested fields', async () => {
    const { server, unsafeClient, asScopedToNamespace, getUnsafeInternalClient, fleetGetByIDs } =
      makeServer();

    await new PackagePolicyService(server).getByIds({
      spaceId: 'space-one',
      packagePolicyIds: ['policy-one', 'policy-two'],
      additionalSpaceIds: ['space-two', 'space-one'],
      fields: ['name', 'condition'],
    });

    expect(getUnsafeInternalClient).toHaveBeenCalledTimes(1);
    expect(asScopedToNamespace).not.toHaveBeenCalled();
    expect(fleetGetByIDs).toHaveBeenCalledWith(unsafeClient, ['policy-one', 'policy-two'], {
      ignoreMissing: true,
      spaceIds: ['space-one', DEFAULT_SPACE_ID, 'space-two'],
      fields: ['name', 'condition'],
    });
  });
});

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
    expect(getByIds).toHaveBeenCalledWith(expect.anything(), ['policyId'], {
      ignoreMissing: true,
      fields: ['name'],
    });
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

describe('PackagePolicyService scheduled revision bumps', () => {
  const echoCreated = (fleetBulkCreate: jest.Mock) =>
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));

  // Classic locations used to bump inside Fleet's own write, once per write;
  // both kinds now share the scheduled bump.
  it.each([
    ['classic', undefined],
    ['scalable', "agent.id == 'agent-1'"],
  ])('writes %s-location creates without a bump and schedules one', async (_kind, condition) => {
    const { server, fleetBulkCreate } = makeServer();
    echoCreated(fleetBulkCreate);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy({ condition })],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(fleetBulkCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ bumpRevision: false })
    );
    expect(scheduleBumps).toHaveBeenCalledWith(['policyId'], undefined);
  });

  it('skips the batching window for Test Now creates', async () => {
    const { server, fleetBulkCreate } = makeServer();
    echoCreated(fleetBulkCreate);

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy({ id: undefined })],
      spaceId: DEFAULT_SPACE_ID,
      immediate: true,
    });

    expect(scheduleBumps).toHaveBeenCalledWith(['policyId'], { delayMs: 0 });
  });

  it('writes updates without a bump and schedules one', async () => {
    const { server, fleetBulkUpdate } = makeServer();
    const updatedPolicy: UpdatePackagePolicyWithId = { ...policy(), id: 'testId-policyId' };
    fleetBulkUpdate.mockResolvedValue({ updatedPolicies: [updatedPolicy], failedPolicies: [] });

    await new PackagePolicyService(server).bulkUpdate({
      policiesToUpdate: [updatedPolicy],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(fleetBulkUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [updatedPolicy],
      expect.objectContaining({ bumpRevision: false })
    );
    expect(scheduleBumps).toHaveBeenCalledWith(['policyId'], undefined);
  });

  it('schedules bumps only for deletes that succeeded', async () => {
    const { server, fleetDelete, fleetGetByIDs } = makeServer();
    fleetGetByIDs.mockResolvedValue([
      policy({ id: 'deleted', policy_ids: ['ap-ok'] }),
      policy({ id: 'failed', policy_ids: ['ap-failed'] }),
    ]);
    fleetDelete.mockResolvedValue([
      { id: 'deleted', success: true, policy_ids: ['ap-ok'] },
      { id: 'failed', success: false, policy_ids: ['ap-failed'] },
    ]);

    await new PackagePolicyService(server).bulkDelete({
      policyIdsToDelete: ['deleted', 'failed'],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(fleetDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['deleted', 'failed'],
      expect.objectContaining({ bumpRevision: false })
    );
    expect(scheduleBumps).toHaveBeenCalledWith(['ap-ok'], undefined);
  });
});

describe('PackagePolicyService deferred revision bumps', () => {
  it('collects agent policies across writes, then schedules each once', async () => {
    const { server, fleetBulkUpdate } = makeServer();
    fleetBulkUpdate.mockImplementation(async (_client, _esClient, policies) => ({
      updatedPolicies: policies,
      failedPolicies: [],
    }));
    const service = new PackagePolicyService(server);
    const deferredBumps = new Set<string>();

    for (const id of ['monitor-1-policyId', 'monitor-2-policyId']) {
      await service.bulkUpdate({
        policiesToUpdate: [{ ...policy(), id }],
        spaceId: DEFAULT_SPACE_ID,
        deferredBumps,
      });
    }

    expect(deferredBumps).toEqual(new Set(['policyId']));
    expect(scheduleBumps).not.toHaveBeenCalled();

    await service.scheduleRevisionBumps(deferredBumps);

    expect(scheduleBumps).toHaveBeenCalledTimes(1);
    expect(scheduleBumps).toHaveBeenCalledWith(['policyId'], undefined);
    expect(deferredBumps.size).toBe(0);
  });

  it('defers creates and deletes too', async () => {
    const { server, fleetBulkCreate, fleetDelete, fleetGetByIDs } = makeServer();
    const created = policy({ id: 'monitor-1-policyId' });
    const deleted = policy({ id: 'monitor-2-policyId' });
    fleetBulkCreate.mockResolvedValue({ created: [created], failed: [] });
    fleetGetByIDs.mockResolvedValue([deleted]);
    fleetDelete.mockResolvedValue([
      { id: deleted.id, success: true, policy_ids: ['otherPolicyId'] },
    ]);
    const service = new PackagePolicyService(server);
    const deferredBumps = new Set<string>();

    await service.bulkCreate({ newPolicies: [created], spaceId: DEFAULT_SPACE_ID, deferredBumps });
    await service.bulkDelete({
      policyIdsToDelete: [deleted.id as string],
      spaceId: DEFAULT_SPACE_ID,
      deferredBumps,
    });

    expect(deferredBumps).toEqual(new Set(['policyId', 'otherPolicyId']));
    expect(scheduleBumps).not.toHaveBeenCalled();
  });
});

describe('bumpAgentPolicyRevision', () => {
  const makeBumpServer = (agentPolicies: Array<Partial<AgentPolicy>>) => {
    const asScopedToNamespace = jest.fn((space: string) => ({ __space: space }));
    const getByIds = jest.fn().mockResolvedValue(agentPolicies);
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const server = {
      fleet: { agentPolicyService: { getByIds, bumpRevision } },
      coreStart: {
        savedObjects: {
          getUnsafeInternalClient: () => ({ asScopedToNamespace }),
          createInternalRepository: () => ({ __unscoped: true }),
        },
        elasticsearch: { client: { asInternalUser: { __es: true } } },
      },
    } as unknown as SyntheticsServerSetup;
    return { server, getByIds, bumpRevision };
  };

  it('looks the agent policy up across all spaces with an unscoped client', async () => {
    const { server, getByIds } = makeBumpServer([{ id: 'policyId', space_ids: ['default'] }]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(getByIds).toHaveBeenCalledWith(
      { __unscoped: true },
      [{ id: 'policyId', spaceId: ALL_SPACES_ID }],
      expect.objectContaining({ ignoreMissing: true })
    );
  });

  it('bumps through a space the agent policy lives in', async () => {
    const { server, bumpRevision } = makeBumpServer([{ id: 'policyId', space_ids: ['team-x'] }]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(bumpRevision).toHaveBeenCalledWith({ __space: 'team-x' }, { __es: true }, 'policyId', {
      asyncDeploy: true,
    });
  });

  it('bumps through the default space for an all-spaces agent policy', async () => {
    // `*` is not a writable namespace, so an all-spaces policy bumps via default.
    const { server, bumpRevision } = makeBumpServer([
      { id: 'policyId', space_ids: [ALL_SPACES_ID] },
    ]);

    await bumpAgentPolicyRevision(server, 'policyId');

    expect(bumpRevision).toHaveBeenCalledWith(
      { __space: DEFAULT_SPACE_ID },
      expect.anything(),
      'policyId',
      { asyncDeploy: true }
    );
  });
});

describe('PackagePolicyService.bulkDelete', () => {
  it('still deletes an orphaned package policy whose policy_ids is an empty array', async () => {
    const { server, fleetGetByIDs, fleetDelete, getByIds } = makeServer();
    // No agent policy attached — Fleet normalizes this to policy_ids: [].
    fleetGetByIDs.mockResolvedValue([{ id: 'orphaned-policy', name: 'orphaned', policy_ids: [] }]);
    getByIds.mockResolvedValue([]);

    await new PackagePolicyService(server).bulkDelete({
      policyIdsToDelete: ['orphaned-policy'],
      spaceId: 'naims',
    });

    expect(fleetDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['orphaned-policy'],
      expect.objectContaining({ force: true, asyncDeploy: true })
    );
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

  it('source-filters to the fields the rebalance path reads', async () => {
    const { server, list } = makeListServer([[{ id: 'm1-loc' }]]);

    await new PackagePolicyService(server).listByAgentPolicy({ agentPolicyId: 'ap-1' });

    // Not just any projection: dropping one of these silently yields
    // `undefined` downstream, and keeping the policy body loads every browser
    // monitor's inline script for a write that never sends it.
    expect(list).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fields: SHARDED_PACKAGE_POLICY_FIELDS })
    );
    expect(SHARDED_PACKAGE_POLICY_FIELDS).toEqual([
      'name',
      'condition',
      'revision',
      'policy_ids',
      'inputs.type',
      'inputs.enabled',
    ]);
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
    const asScopedToNamespace = jest.fn((space: string) => {
      const client = { __space: space };
      Object.defineProperty(client, 'getCurrentNamespace', { value: () => space });
      return client;
    });
    const bulkUpdatePartial = jest
      .fn()
      .mockResolvedValue({ failedPolicies: [], updatedPolicies: [] });
    const getByIds = jest.fn().mockResolvedValue([]);
    const server = {
      logger: loggerMock.create(),
      fleet: {
        packagePolicyService: { bulkUpdatePartial },
        agentPolicyService: { getByIds, scheduleRevisionBump: scheduleBumps },
      },
      coreStart: {
        savedObjects: {
          getUnsafeInternalClient: () => ({ asScopedToNamespace }),
          createInternalRepository: () => ({}),
        },
        elasticsearch: { client: { asInternalUser: { __es: true } } },
      },
    } as unknown as SyntheticsServerSetup;
    return { server, bulkUpdatePartial, getByIds, asScopedToNamespace };
  };

  const update = (id: string, agentPolicyIds = ['ap-1']): ConditionUpdate => ({
    update: { id, version: 'WzAsMV0=', attributes: { condition: `'agent.id' == '${id}'` } },
    agentPolicyIds,
  });

  it('writes directly to the policy own space without deriving routing from the agent policy', async () => {
    const { server, bulkUpdatePartial, getByIds } = makeUpdateServer();

    await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc')],
      spaceId: 'team-x',
    });

    // No agent-policy lookup (the create/edit routing is bypassed).
    expect(getByIds).not.toHaveBeenCalled();
    // Client scoped straight to the policy's own space.
    expect(bulkUpdatePartial.mock.calls[0][0]).toEqual({ __space: 'team-x' });
    expect(bulkUpdatePartial.mock.calls[0][1]).toEqual([update('m1-loc').update]);
  });

  it('maps ALL_SPACES to the default space (a valid namespace for an all-spaces policy)', async () => {
    const { server, bulkUpdatePartial } = makeUpdateServer();

    await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc')],
      spaceId: ALL_SPACES_ID,
    });

    expect(bulkUpdatePartial.mock.calls[0][0]).toEqual({ __space: DEFAULT_SPACE_ID });
  });

  it('is a no-op for an empty update list', async () => {
    const { server, bulkUpdatePartial } = makeUpdateServer();

    const failed = await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [],
      spaceId: 'team-x',
    });

    expect(failed).toEqual([]);
    expect(bulkUpdatePartial).not.toHaveBeenCalled();
  });

  it('schedules a revision bump for the agent policies of the updated package policies', async () => {
    const { server, bulkUpdatePartial } = makeUpdateServer();
    // `bulkUpdatePartial` echoes back only what was sent — notably NOT
    // `policy_ids` — so the bump targets must come from the request side.
    bulkUpdatePartial.mockResolvedValue({
      failedPolicies: [],
      updatedPolicies: [{ id: 'm1-loc' }, { id: 'm2-loc' }],
    });

    await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc'), update('m2-loc')],
      spaceId: 'team-x',
    });

    expect(scheduleBumps).toHaveBeenCalledWith(['ap-1', 'ap-1'], undefined);
  });

  it('bumps only the agent policies whose writes actually landed', async () => {
    const { server, bulkUpdatePartial } = makeUpdateServer();
    bulkUpdatePartial.mockResolvedValue({
      updatedPolicies: [{ id: 'm1-loc' }],
      failedPolicies: [{ update: update('m2-loc').update, error: { statusCode: 409 } }],
    });

    const failed = await new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc', ['ap-ok']), update('m2-loc', ['ap-conflicted'])],
      spaceId: 'team-x',
    });

    expect(failed).toHaveLength(1);
    expect(scheduleBumps).toHaveBeenCalledWith(['ap-ok'], undefined);
  });
});
