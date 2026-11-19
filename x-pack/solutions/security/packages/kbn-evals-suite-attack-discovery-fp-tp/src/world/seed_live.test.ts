/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { AD2_ALERTS_INDEX } from '@kbn/evals-suite-attack-discovery-agent-builder';
import {
  buildEncodedPowershellTwin,
  ENCODED_POWERSHELL_ATTACK_ID,
  getEncodedPowershellIds,
} from '../scenarios/encoded_powershell';
import { FP_TP_ATTACK_ADHOC_INDEX } from './constants';
import {
  buildLiveSeedPlan,
  cleanupManualSeedLive,
  ensureFpTpSeedPrerequisites,
  seedFixture,
  twinToWorld,
} from './seed_live';
import type { FpTpLiveKbnRequest } from './seed_live';

const ids = getEncodedPowershellIds();

describe('buildLiveSeedPlan', () => {
  const now = new Date('2026-09-17T16:00:00.000Z');
  const plan = buildLiveSeedPlan(twinToWorld(buildEncodedPowershellTwin('fp')), now);

  it('returns the authored attack document id', () => {
    expect(plan.attackId).toBe(ENCODED_POWERSHELL_ATTACK_ID);
  });

  it('returns the adhoc Attack Discovery index', () => {
    expect(plan.attackIndex).toBe(FP_TP_ATTACK_ADHOC_INDEX);
  });

  it('returns alert bulk operations targeting the detection alerts index', () => {
    expect(plan.alertOperations[0]).toEqual({
      index: { _index: AD2_ALERTS_INDEX, _id: plan.alertIds[0] },
    });
  });

  it('returns event bulk operations that create into logs data streams', () => {
    expect(plan.eventOperations[0]).toEqual({
      create: {
        _index: 'logs-endpoint.events.process-default',
        _id: ids.process1Id,
      },
    });
  });

  it('returns attack-discovery as the synthetic attack rule type', () => {
    expect(plan.attackDocument?.['kibana.alert.rule.rule_type_id']).toBe('attack-discovery');
  });

  it('returns a host CRUD request for the FP discriminator entity', () => {
    expect(plan.entities.some((entity) => entity.entityType === 'host')).toBe(true);
  });

  it('returns the host id shared by the seeded alerts and events', () => {
    expect(plan.hostIds).toEqual([ids.hostId]);
  });

  it('returns no attack document for a world without an Attack Discovery', () => {
    const world = { ...twinToWorld(buildEncodedPowershellTwin('tp')), attack: undefined };
    expect(buildLiveSeedPlan(world).attackDocument).toBeUndefined();
  });
});

describe('cleanupManualSeedLive', () => {
  it('returns a delete-by-id query for leftover data-stream events', async () => {
    const deleteByQuery = jest.fn().mockResolvedValue({});

    await cleanupManualSeedLive({ deleteByQuery } as unknown as EsClient, [
      {
        index: 'logs-endpoint.events.process-default',
        id: ids.process1Id,
      },
    ]);

    expect(deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-endpoint.events.process-default',
        query: { ids: { values: [ids.process1Id] } },
      })
    );
  });
});

describe('ensureFpTpSeedPrerequisites', () => {
  const stopCall = expect.objectContaining({
    method: 'PUT',
    path: '/api/security/entity_store/stop',
  });

  it.each(['running', 'stopped'])(
    'returns after stopping extraction when the Entity Store is %s',
    async (status) => {
      const kbnRequest = jest.fn().mockResolvedValue({ statusCode: 200, body: { status } });

      await ensureFpTpSeedPrerequisites(kbnRequest);

      expect(kbnRequest).toHaveBeenCalledWith(stopCall);
    }
  );

  it('throws when stopping extraction fails', async () => {
    const kbnRequest = jest.fn(async ({ path }: { path: string }) =>
      path.endsWith('/stop')
        ? { statusCode: 500, body: { message: 'boom' } }
        : { statusCode: 200, body: { status: 'running' } }
    );

    await expect(ensureFpTpSeedPrerequisites(kbnRequest)).rejects.toThrow(
      'Failed to stop Entity Store extraction (500): boom'
    );
  });

  describe('the returned restore function', () => {
    const startCall = expect.objectContaining({
      method: 'PUT',
      path: '/api/security/entity_store/start',
    });

    it('returns after restarting extraction that was running', async () => {
      const kbnRequest = jest
        .fn()
        .mockResolvedValue({ statusCode: 200, body: { status: 'running' } });
      const restore = await ensureFpTpSeedPrerequisites(kbnRequest);

      await restore();

      expect(kbnRequest).toHaveBeenCalledWith(startCall);
    });

    it('returns without starting extraction that was already stopped', async () => {
      const kbnRequest = jest
        .fn()
        .mockResolvedValue({ statusCode: 200, body: { status: 'stopped' } });
      const restore = await ensureFpTpSeedPrerequisites(kbnRequest);

      await restore();

      expect(kbnRequest).not.toHaveBeenCalledWith(startCall);
    });
  });
});

describe('seedFixture', () => {
  const world = twinToWorld(buildEncodedPowershellTwin('tp'));
  let esClient: {
    bulk: jest.Mock;
    index: jest.Mock;
    deleteByQuery: jest.Mock;
    search: jest.Mock;
    updateByQuery: jest.Mock;
  };
  let kbnRequest: jest.MockedFunction<FpTpLiveKbnRequest>;

  beforeEach(() => {
    esClient = {
      bulk: jest.fn().mockResolvedValue({ errors: false }),
      index: jest.fn().mockResolvedValue({}),
      deleteByQuery: jest.fn().mockResolvedValue({}),
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
      updateByQuery: jest.fn().mockResolvedValue({ updated: 1 }),
    };
    kbnRequest = jest.fn().mockResolvedValue({ statusCode: 200, body: {} });
  });

  it('returns a cleanup that deletes the seeded Attack Discovery by id', async () => {
    const { cleanup } = await seedFixture({
      esClient: esClient as unknown as EsClient,
      kbnRequest,
      world,
    });
    await cleanup();

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: FP_TP_ATTACK_ADHOC_INDEX,
        query: { ids: { values: [ENCODED_POWERSHELL_ATTACK_ID] } },
      })
    );
  });

  it('returns a cleanup that deletes every seeded entity', async () => {
    const { cleanup } = await seedFixture({
      esClient: esClient as unknown as EsClient,
      kbnRequest,
      world,
    });
    kbnRequest.mockClear();
    await cleanup();

    expect(kbnRequest.mock.calls.map(([options]) => options.body)).toEqual([
      { entityId: ids.hostEntityId },
      { entityId: ids.userEntityId },
    ]);
  });

  it('returns a cleanup that deletes entities the Entity Store built on the seeded host', async () => {
    const extractedId = `user:someone@${ids.hostId}@local`;
    esClient.search.mockResolvedValue({
      hits: { hits: [{ _source: { entity: { id: extractedId } } }] },
    });
    const { cleanup } = await seedFixture({
      esClient: esClient as unknown as EsClient,
      kbnRequest,
      world: { ...world, entities: [] },
    });
    kbnRequest.mockClear();
    await cleanup();

    expect(kbnRequest.mock.calls.map(([options]) => options.body)).toEqual([
      { entityId: extractedId },
    ]);
  });

  it('returns the seeded world with timestamps shifted to the seed time', async () => {
    const now = new Date('2026-09-24T10:00:00.000Z');
    const { seededWorld } = await seedFixture({
      esClient: esClient as unknown as EsClient,
      kbnRequest,
      world,
      now,
    });

    expect(seededWorld).toEqual(buildLiveSeedPlan(world, now).world);
  });

  it('returns after writing the user name and host id onto the seeded user entity', async () => {
    await seedFixture({ esClient: esClient as unknown as EsClient, kbnRequest, world });

    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { term: { 'entity.id': ids.userEntityId } },
        script: expect.objectContaining({
          params: {
            fields: expect.objectContaining({ host: expect.objectContaining({ id: ids.hostId }) }),
          },
        }),
      })
    );
  });

  it('throws when the user entity identity fields are not written', async () => {
    esClient.updateByQuery.mockResolvedValue({ updated: 0 });

    await expect(
      seedFixture({ esClient: esClient as unknown as EsClient, kbnRequest, world })
    ).rejects.toThrow(`Expected to write identity fields on entity ${ids.userEntityId}, updated 0`);
  });

  it('returns after deleting the partially seeded alerts when indexing fails', async () => {
    esClient.index.mockRejectedValue(new Error('index failed'));

    await seedFixture({ esClient: esClient as unknown as EsClient, kbnRequest, world }).catch(
      () => undefined
    );

    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: AD2_ALERTS_INDEX })
    );
  });

  it('returns the partial-seed cleanup to onCleanupFailure when that cleanup fails', async () => {
    esClient.index.mockRejectedValue(new Error('index failed'));
    esClient.deleteByQuery.mockRejectedValue(new Error('delete failed'));
    const onCleanupFailure = jest.fn();

    await seedFixture({
      esClient: esClient as unknown as EsClient,
      kbnRequest,
      world,
      onCleanupFailure,
    }).catch(() => undefined);

    expect(onCleanupFailure).toHaveBeenCalledWith(expect.any(Function));
  });
});
