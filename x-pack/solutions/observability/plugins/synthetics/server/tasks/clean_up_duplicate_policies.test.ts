/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SyntheticsServerSetup } from '../types';
import {
  DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE,
  bumpAgentPolicyRevisions,
  deletePackagePolicies,
  findLeftoverPackagePolicies,
} from './clean_up_duplicate_policies';
import { getFilterForTestNowRun } from './test_now_run_filter';

interface MonitorFixture {
  id: string;
  namespaces: string[];
  attributes: {
    id: string;
    origin: string;
    locations: Array<{ id: string; isServiceManaged: boolean }>;
  };
}

const monitor = (
  id: string,
  locationIds: string[],
  { origin = 'ui', queryId = id, namespaces = ['default'], serviceManaged = [] as string[] } = {}
): MonitorFixture => ({
  id,
  namespaces,
  attributes: {
    id: queryId,
    origin,
    locations: [
      ...locationIds.map((locationId) => ({ id: locationId, isServiceManaged: false })),
      ...serviceManaged.map((locationId) => ({ id: locationId, isServiceManaged: true })),
    ],
  },
});

const deleted = (id: string, policyIds: string[]) => ({ id, success: true, policy_ids: policyIds });

const makeServer = ({
  policyIdPages = [[]] as string[][],
  monitorPages = [[]] as MonitorFixture[][],
  deleteMock = jest.fn().mockResolvedValue([]),
  bumpRevisionMock = jest.fn().mockResolvedValue(undefined),
  spaceIdsByPolicy = {} as Record<string, string[]>,
} = {}) => {
  const logger = loggerMock.create();
  const esClient = {} as ElasticsearchClient;
  const reads: string[] = [];
  const scopedClients: Record<string, unknown> = {};
  const asScopedToNamespace = jest.fn((spaceId: string) => {
    scopedClients[spaceId] = scopedClients[spaceId] ?? { spaceId };
    return scopedClients[spaceId];
  });
  const fetchAllItemIds = jest.fn(async () => {
    reads.push('policies');
    return (async function* () {
      for (const page of policyIdPages) {
        yield page;
      }
    })();
  });
  const agentPolicyService = {
    bumpRevision: bumpRevisionMock,
    getByIds: jest.fn(async (_soClient: unknown, ids: Array<{ id: string }>) =>
      ids.map(({ id }) => ({ id, space_ids: spaceIdsByPolicy[id] ?? [] }))
    ),
  };
  const fleet = {
    packagePolicyService: { delete: deleteMock, fetchAllItemIds },
    agentPolicyService,
  };
  const server = {
    coreStart: {
      savedObjects: {
        createInternalRepository: jest.fn().mockReturnValue({ unscoped: true }),
        getUnsafeInternalClient: jest.fn().mockReturnValue({ asScopedToNamespace }),
      },
      elasticsearch: { client: { asInternalUser: esClient } },
    },
    fleet,
    pluginsStart: { fleet },
    logger,
  } as unknown as SyntheticsServerSetup;
  const soClient = {
    createPointInTimeFinder: jest.fn(() => {
      reads.push('monitors');
      return {
        async *find() {
          for (const savedObjects of monitorPages) {
            yield { saved_objects: savedObjects };
          }
        },
        close: jest.fn().mockResolvedValue(undefined),
      };
    }),
  } as unknown as SavedObjectsClientContract;

  return {
    server,
    soClient,
    esClient,
    logger,
    reads,
    fetchAllItemIds,
    deleteMock,
    bumpRevisionMock,
    asScopedToNamespace,
    scopedClients,
  };
};

describe('findLeftoverPackagePolicies', () => {
  it('finds nothing when every monitor has its policy', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1']],
      monitorPages: [[monitor('m1', ['loc1'])]],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: [],
      missingLocationIds: [],
    });
  });

  it('reports an old-format twin as a leftover when the new-format policy exists', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1', 'm1-loc1-default']],
      monitorPages: [[monitor('m1', ['loc1'])]],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: ['m1-loc1-default'],
      missingLocationIds: [],
    });
  });

  it('reports a sole old-format policy as a leftover and its location as missing', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1-default']],
      monitorPages: [[monitor('m1', ['loc1'])]],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: ['m1-loc1-default'],
      missingLocationIds: ['loc1'],
    });
  });

  it('reports policies that match no monitor as leftovers', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1', 'orphan-loc1']],
      monitorPages: [[monitor('m1', ['loc1'])]],
    });

    const { leftoverIds } = await findLeftoverPackagePolicies(server, soClient);

    expect(leftoverIds).toEqual(['orphan-loc1']);
  });

  it('expects a single policy per location for a monitor shared across spaces', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1', 'm1-loc1-default', 'm1-loc1-stores']],
      monitorPages: [[monitor('m1', ['loc1'], { namespaces: ['default', 'stores'] })]],
    });

    const { leftoverIds } = await findLeftoverPackagePolicies(server, soClient);

    expect(leftoverIds).toEqual(['m1-loc1-default', 'm1-loc1-stores']);
  });

  it('builds project monitor policy ids from the monitor id attribute', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['journey-project-loc1']],
      monitorPages: [
        [monitor('saved-object-id', ['loc1'], { origin: 'project', queryId: 'journey-project' })],
      ],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: [],
      missingLocationIds: [],
    });
  });

  it('does not expect policies for service-managed locations', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1']],
      monitorPages: [[monitor('m1', ['loc1'], { serviceManaged: ['us-east'] })]],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: [],
      missingLocationIds: [],
    });
  });

  it('reads policies and monitors across pages', async () => {
    const { server, soClient } = makeServer({
      policyIdPages: [['m1-loc1', 'extra-a'], ['extra-b']],
      monitorPages: [[monitor('m1', ['loc1'])], [monitor('m2', ['loc2'])]],
    });

    await expect(findLeftoverPackagePolicies(server, soClient)).resolves.toEqual({
      leftoverIds: ['extra-a', 'extra-b'],
      missingLocationIds: ['loc2'],
    });
  });

  it('reports each missing location once', async () => {
    const { server, soClient } = makeServer({
      monitorPages: [[monitor('m1', ['loc1']), monitor('m2', ['loc1']), monitor('m3', ['loc2'])]],
    });

    const { missingLocationIds } = await findLeftoverPackagePolicies(server, soClient);

    expect(missingLocationIds).toEqual(['loc1', 'loc2']);
  });

  it('lists policies before monitors so a policy created mid-scan is never a leftover', async () => {
    const { server, soClient, reads } = makeServer({
      policyIdPages: [['m1-loc1']],
      monitorPages: [[monitor('m1', ['loc1'])]],
    });

    await findLeftoverPackagePolicies(server, soClient);

    expect(reads).toEqual(['policies', 'monitors']);
  });

  it('scans private-location policies in every space and skips Test Now policies', async () => {
    const { server, soClient, fetchAllItemIds } = makeServer();

    await findLeftoverPackagePolicies(server, soClient);

    expect(fetchAllItemIds).toHaveBeenCalledWith(
      soClient,
      expect.objectContaining({ kuery: getFilterForTestNowRun(true), spaceIds: ['*'] })
    );
  });
});

describe('deletePackagePolicies', () => {
  it('does nothing when there is nothing to delete', async () => {
    const { server, soClient, esClient, deleteMock, bumpRevisionMock } = makeServer();

    await deletePackagePolicies([], soClient, esClient, server);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(bumpRevisionMock).not.toHaveBeenCalled();
  });

  it('deletes in batches across all spaces without letting Fleet bump each one', async () => {
    const deleteMock = jest
      .fn()
      .mockImplementation((_so, _es, batch: string[]) =>
        Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])))
      );
    const { server, soClient, esClient } = makeServer({ deleteMock });
    const ids = Array.from(
      { length: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 50 },
      (_, i) => `p-${i}`
    );

    await deletePackagePolicies(ids, soClient, esClient, server);

    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(deleteMock.mock.calls[0][2]).toEqual(
      ids.slice(0, DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE)
    );
    expect(deleteMock.mock.calls[1][2]).toEqual(
      ids.slice(DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE)
    );
    expect(deleteMock.mock.calls[0][3]).toEqual({
      force: true,
      spaceIds: ['*'],
      ignoreMissing: true,
      bumpRevision: false,
    });
  });

  it('bumps each batch before deleting the next so an interrupted run cannot strand it', async () => {
    const order: string[] = [];
    const deleteMock = jest.fn().mockImplementation((_so, _es, batch: string[]) => {
      order.push(`delete:${batch.length}`);
      return Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])));
    });
    const bumpRevisionMock = jest.fn().mockImplementation(async () => {
      order.push('bump');
    });
    const { server, soClient, esClient } = makeServer({ deleteMock, bumpRevisionMock });
    const ids = Array.from(
      { length: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 50 },
      (_, i) => `p-${i}`
    );

    await deletePackagePolicies(ids, soClient, esClient, server);

    expect(order).toEqual([
      `delete:${DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE}`,
      'bump',
      'delete:50',
      'bump',
    ]);
  });

  it('bumps only agent policies whose package policies were actually deleted', async () => {
    const deleteMock = jest
      .fn()
      .mockResolvedValue([
        deleted('p-1', ['agent-a']),
        { id: 'p-2', success: false, policy_ids: ['agent-b'] },
        { id: 'p-3', success: true, policy_id: 'agent-c' },
      ]);
    const { server, soClient, esClient, bumpRevisionMock } = makeServer({ deleteMock });

    await deletePackagePolicies(['p-1', 'p-2', 'p-3'], soClient, esClient, server);

    expect(bumpRevisionMock.mock.calls.map((call) => call[2])).toEqual(['agent-a', 'agent-c']);
  });

  it('stops between batches once the task is aborted', async () => {
    const controller = new AbortController();
    const deleteMock = jest.fn().mockImplementation((_so, _es, batch: string[]) => {
      controller.abort();
      return Promise.resolve(batch.map((id) => deleted(id, ['agent-a'])));
    });
    const { server, soClient, esClient, bumpRevisionMock } = makeServer({ deleteMock });
    const ids = Array.from(
      { length: DUPLICATE_PACKAGE_POLICY_DELETE_BATCH_SIZE + 50 },
      (_, i) => `p-${i}`
    );

    await deletePackagePolicies(ids, soClient, esClient, server, controller.signal);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    // what was already deleted still gets its bump
    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
  });
});

describe('bumpAgentPolicyRevisions', () => {
  it('bumps each agent policy once', async () => {
    const { server, bumpRevisionMock } = makeServer();

    await bumpAgentPolicyRevisions(['agent-a', 'agent-a'], server);

    expect(bumpRevisionMock).toHaveBeenCalledTimes(1);
  });

  it('bumps in the space the agent policy lives in', async () => {
    const { server, esClient, asScopedToNamespace, scopedClients, bumpRevisionMock } = makeServer({
      spaceIdsByPolicy: { 'agent-a': ['team-space'] },
    });

    await bumpAgentPolicyRevisions(['agent-a'], server);

    expect(asScopedToNamespace).toHaveBeenCalledWith('team-space');
    expect(bumpRevisionMock).toHaveBeenCalledWith(
      scopedClients['team-space'],
      esClient,
      'agent-a',
      {
        asyncDeploy: true,
      }
    );
  });

  it('logs a failed bump and still bumps the rest', async () => {
    const bumpRevisionMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('deployment failed'))
      .mockResolvedValue(undefined);
    const { server, logger } = makeServer({ bumpRevisionMock });

    await bumpAgentPolicyRevisions(['agent-a', 'agent-b'], server);

    expect(bumpRevisionMock).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('agent-a'), {
      error: expect.any(Error),
    });
  });
});
