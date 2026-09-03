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
import {
  PackagePolicyService,
  flushPendingAgentPolicyRevisionBumps,
} from './package_policy_service';
import { AGENT_POLICY_REVISION_BATCH_WINDOW_MS } from './agent_policy_revision_batcher';
import type { ConditionUpdate } from './rebalance_writes';
import { SHARDED_PACKAGE_POLICY_FIELDS } from './rebalance_writes';
import type { SyntheticsServerSetup } from '../../types';

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
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
  // Serves both the create/edit space routing and the batched bump's
  // agent-policy space lookup; individual tests override as needed.
  const getByIds = jest.fn().mockResolvedValue([]);
  const bumpRevision = jest.fn().mockResolvedValue(undefined);

  const server = {
    logger: loggerMock.create(),
    fleet: {
      packagePolicyService: {
        bulkCreate: fleetBulkCreate,
        bulkUpdate: fleetBulkUpdate,
        getByIDs: fleetGetByIDs,
        delete: fleetDelete,
      },
      agentPolicyService: { getByIds, bumpRevision },
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
    bumpRevision,
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

  it('short-circuits to the DEFAULT-space client without fetching agent policies when the monitor is in the default space', async () => {
    const { server, getByIds, fleetBulkCreate } = makeServer();

    await new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy()],
      spaceId: DEFAULT_SPACE_ID,
    });

    expect(getByIds).not.toHaveBeenCalled();
    expect(clientPassedToFleet(fleetBulkCreate)).toEqual({ __space: DEFAULT_SPACE_ID });
  });

  it('coalesces concurrent scalable-location writes into one agent policy revision bump', async () => {
    const { server, fleetBulkCreate, bumpRevision } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));
    const service = new PackagePolicyService(server);

    const requests = Promise.all([
      service.bulkCreate({
        newPolicies: [policy({ id: 'monitor-1-policyId', condition: "agent.id == 'agent-1'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
      service.bulkCreate({
        newPolicies: [policy({ id: 'monitor-2-policyId', condition: "agent.id == 'agent-2'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
    ]);
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await requests;

    expect(fleetBulkCreate).toHaveBeenCalledTimes(2);
    expect(fleetBulkCreate).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ bumpRevision: false })
    );
    expect(fleetBulkCreate).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ bumpRevision: false })
    );
    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'policyId', {
      asyncDeploy: true,
    });
  });

  it('batches scalable-location updates before bumping the agent policy revision', async () => {
    const { server, fleetBulkUpdate, bumpRevision } = makeServer();
    const updatedPolicy: UpdatePackagePolicyWithId = {
      ...policy({ condition: "agent.id == 'agent-1'" }),
      id: 'testId-policyId',
    };
    fleetBulkUpdate.mockResolvedValue({
      updatedPolicies: [updatedPolicy],
      failedPolicies: [],
    });

    const request = new PackagePolicyService(server).bulkUpdate({
      policiesToUpdate: [updatedPolicy],
      spaceId: DEFAULT_SPACE_ID,
    });
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;

    expect(fleetBulkUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [updatedPolicy],
      expect.objectContaining({ bumpRevision: false })
    );
    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('batches scalable-location deletes before bumping the agent policy revision', async () => {
    const { server, fleetDelete, fleetGetByIDs, bumpRevision } = makeServer();
    const deletedPolicyId = 'testId-policyId';
    const deletedPolicy = policy({ id: deletedPolicyId, condition: "agent.id == 'agent-1'" });
    fleetGetByIDs.mockResolvedValue([deletedPolicy]);
    fleetDelete.mockResolvedValue([
      { id: deletedPolicy.id, success: true, policy_ids: deletedPolicy.policy_ids },
    ]);

    const request = new PackagePolicyService(server).bulkDelete({
      policyIdsToDelete: [deletedPolicyId],
      spaceId: DEFAULT_SPACE_ID,
    });
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;

    expect(fleetDelete).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      [deletedPolicyId],
      expect.objectContaining({ bumpRevision: false })
    );
    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });
});

describe('PackagePolicyService revision batcher sharing', () => {
  it('coalesces writes made through separate service instances on one server', async () => {
    const { server, fleetBulkCreate, bumpRevision } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));

    // Callers construct PackagePolicyService ad hoc (e.g. the monitor-create
    // rollback in add_monitor_api), so a per-instance batcher would let these
    // race each other on the same agent policy instead of sharing one bump.
    const requests = Promise.all([
      new PackagePolicyService(server).bulkCreate({
        newPolicies: [policy({ id: 'monitor-1-policyId', condition: "agent.id == 'agent-1'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
      new PackagePolicyService(server).bulkCreate({
        newPolicies: [policy({ id: 'monitor-2-policyId', condition: "agent.id == 'agent-2'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
    ]);
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await requests;

    expect(fleetBulkCreate).toHaveBeenCalledTimes(2);
    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('keeps separate servers on separate batchers', async () => {
    const first = makeServer();
    const second = makeServer();
    for (const { fleetBulkCreate } of [first, second]) {
      fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
        created: policies,
        failed: [],
      }));
    }

    const requests = Promise.all([
      new PackagePolicyService(first.server).bulkCreate({
        newPolicies: [policy({ condition: "agent.id == 'agent-1'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
      new PackagePolicyService(second.server).bulkCreate({
        newPolicies: [policy({ condition: "agent.id == 'agent-1'" })],
        spaceId: DEFAULT_SPACE_ID,
      }),
    ]);
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await requests;

    expect(first.bumpRevision).toHaveBeenCalledTimes(1);
    expect(second.bumpRevision).toHaveBeenCalledTimes(1);
  });
});

describe('PackagePolicyService.flushPendingAgentPolicyRevisionBumps', () => {
  it('bumps a batch still inside its debounce window', async () => {
    const { server, fleetBulkCreate, bumpRevision } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));

    const request = new PackagePolicyService(server).bulkCreate({
      newPolicies: [policy({ condition: "agent.id == 'agent-1'" })],
      spaceId: DEFAULT_SPACE_ID,
    });
    // Let the package-policy write settle so the bump is queued, but stay
    // inside the debounce window so the timer has not fired.
    await jest.advanceTimersByTimeAsync(0);
    expect(bumpRevision).not.toHaveBeenCalled();

    // Simulates plugin stop() landing before the debounce window elapses.
    await flushPendingAgentPolicyRevisionBumps(server);
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for a server that never scheduled a bump', async () => {
    const { server, bumpRevision } = makeServer();

    await flushPendingAgentPolicyRevisionBumps(server);

    expect(bumpRevision).not.toHaveBeenCalled();
  });
});

describe('PackagePolicyService batched revision bump space resolution', () => {
  const scalablePolicy = () => policy({ condition: "agent.id == 'agent-1'" });

  const bumpForScalableCreate = async (server: SyntheticsServerSetup) => {
    const request = new PackagePolicyService(server).bulkCreate({
      newPolicies: [scalablePolicy()],
      spaceId: DEFAULT_SPACE_ID,
    });
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;
  };

  it('looks the agent policy up across all spaces with an unscoped client', async () => {
    const { server, fleetBulkCreate, getByIds } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));

    await bumpForScalableCreate(server);

    expect(getByIds).toHaveBeenCalledWith(
      expect.anything(),
      [{ id: 'policyId', spaceId: ALL_SPACES_ID }],
      expect.objectContaining({ ignoreMissing: true })
    );
  });

  it('bumps through a space the agent policy lives in rather than the writing space', async () => {
    const { server, fleetBulkCreate, getByIds, bumpRevision, asScopedToNamespace } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));
    // The agent policy lives only in team-x. A batch can be won by a client
    // scoped elsewhere (bulkUpdateInSpace scopes to each package policy's own
    // recorded space), so the bump must resolve the space from the agent policy.
    getByIds.mockResolvedValue([{ id: 'policyId', space_ids: ['team-x'] }]);

    await bumpForScalableCreate(server);

    expect(asScopedToNamespace).toHaveBeenCalledWith('team-x');
    expect(bumpRevision).toHaveBeenCalledWith(
      { __space: 'team-x' },
      expect.anything(),
      'policyId',
      { asyncDeploy: true }
    );
  });

  it('bumps through the default space for an all-spaces agent policy', async () => {
    const { server, fleetBulkCreate, getByIds, bumpRevision } = makeServer();
    fleetBulkCreate.mockImplementation(async (_client, _esClient, policies) => ({
      created: policies,
      failed: [],
    }));
    // `*` is not a writable namespace, so an all-spaces policy bumps via default.
    getByIds.mockResolvedValue([{ id: 'policyId', space_ids: [ALL_SPACES_ID] }]);

    await bumpForScalableCreate(server);

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
    const bumpRevision = jest.fn().mockResolvedValue(undefined);
    const server = {
      logger: loggerMock.create(),
      fleet: {
        packagePolicyService: { bulkUpdatePartial },
        agentPolicyService: { getByIds, bumpRevision },
      },
      coreStart: {
        savedObjects: {
          getUnsafeInternalClient: () => ({ asScopedToNamespace }),
          createInternalRepository: () => ({}),
        },
        elasticsearch: { client: { asInternalUser: { __es: true } } },
      },
    } as unknown as SyntheticsServerSetup;
    return { server, bulkUpdatePartial, getByIds, bumpRevision, asScopedToNamespace };
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

  it('routes through the batched revision bump used by the shard-rebalance task', async () => {
    const { server, bulkUpdatePartial, bumpRevision } = makeUpdateServer();
    // `bulkUpdatePartial` echoes back only what was sent — notably NOT
    // `policy_ids` — so the bump targets must come from the request side.
    bulkUpdatePartial.mockResolvedValue({
      failedPolicies: [],
      updatedPolicies: [{ id: 'm1-loc' }, { id: 'm2-loc' }],
    });

    const request = new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc'), update('m2-loc')],
      spaceId: 'team-x',
    });
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    await request;

    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'ap-1', {
      asyncDeploy: true,
    });
  });

  it('bumps only the agent policies whose writes actually landed', async () => {
    const { server, bulkUpdatePartial, bumpRevision } = makeUpdateServer();
    bulkUpdatePartial.mockResolvedValue({
      updatedPolicies: [{ id: 'm1-loc' }],
      failedPolicies: [{ update: update('m2-loc').update, error: { statusCode: 409 } }],
    });

    const request = new PackagePolicyService(server).bulkUpdateInSpace({
      policiesToUpdate: [update('m1-loc', ['ap-ok']), update('m2-loc', ['ap-conflicted'])],
      spaceId: 'team-x',
    });
    await jest.advanceTimersByTimeAsync(AGENT_POLICY_REVISION_BATCH_WINDOW_MS);
    const failed = await request;

    expect(failed).toHaveLength(1);
    expect(bumpRevision).toHaveBeenCalledTimes(1);
    expect(bumpRevision).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ap-ok',
      expect.anything()
    );
  });
});
