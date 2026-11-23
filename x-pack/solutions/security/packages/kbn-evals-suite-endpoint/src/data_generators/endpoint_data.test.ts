/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import {
  metadataCurrentIndexPattern,
  METADATA_UNITED_INDEX,
} from '@kbn/security-solution-plugin/common/endpoint/constants';
import {
  SCENARIOS,
  seedScenario,
  waitForEndpointPackage,
  waitForTransformPropagation,
} from './endpoint_data';

describe('waitForEndpointPackage', () => {
  const installed = { item: { status: 'installed' } };
  const current = { id: 'endpoint.metadata_current-default-9.6.1', state: 'started' };
  const united = { id: 'endpoint.metadata_united-default-9.6.1', state: 'started' };
  const healthy = [current, united];
  const clientsWith = (getTransformStats: jest.Mock) => {
    const request = jest.fn().mockResolvedValue({ data: installed });
    const startTransform = jest.fn().mockResolvedValue({ acknowledged: true });
    const esClient = {
      transform: { getTransformStats, startTransform },
    } as unknown as Client;
    return {
      kbnClient: { request } as unknown as KbnClient,
      esClient,
      startTransform,
    };
  };
  const statsOf = (...transforms: unknown[]) => jest.fn().mockResolvedValue({ transforms });
  // The wait polls on a fixed interval; advance the fake clock until it settles.
  const settle = async <T>(promise: Promise<T>): Promise<T> => {
    let settled = false;
    const tracked = promise.finally(() => {
      settled = true;
    });
    while (!settled) {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(5_000);
    }
    return tracked;
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fails fast with the reason when a transform is in a failed state', async () => {
    const { kbnClient, esClient } = clientsWith(
      statsOf(
        { ...current, state: 'failed', reason: 'Cannot write to a field alias [updated_at]' },
        united
      )
    );

    await expect(
      settle(waitForEndpointPackage(kbnClient, esClient, new ToolingLog(), 60_000))
    ).rejects.toThrow(
      'Endpoint metadata transform failed: endpoint.metadata_current-default-9.6.1: Cannot write to a field alias [updated_at]'
    );
  });

  it('does not poll again once a transform has failed', async () => {
    const getTransformStats = statsOf({ ...current, state: 'failed', reason: 'boom' }, united);
    const { kbnClient, esClient } = clientsWith(getTransformStats);

    await expect(
      settle(waitForEndpointPackage(kbnClient, esClient, new ToolingLog(), 60_000))
    ).rejects.toThrow('Endpoint metadata transform failed');

    expect(getTransformStats).toHaveBeenCalledTimes(1);
  });

  it('restarts a stopped transform and resolves once all transforms run', async () => {
    const getTransformStats = jest
      .fn()
      .mockResolvedValueOnce({ transforms: [{ ...current, state: 'stopped' }, united] })
      .mockResolvedValueOnce({ transforms: healthy });
    const { kbnClient, esClient, startTransform } = clientsWith(getTransformStats);

    await settle(waitForEndpointPackage(kbnClient, esClient, new ToolingLog(), 60_000));

    expect(startTransform).toHaveBeenCalledTimes(1);
    expect(startTransform).toHaveBeenCalledWith({ transform_id: current.id });
  });

  it('keeps waiting through a transient request error', async () => {
    const getTransformStats = jest
      .fn()
      .mockRejectedValueOnce(new Error('connection reset'))
      .mockResolvedValueOnce({ transforms: healthy });
    const { kbnClient, esClient } = clientsWith(getTransformStats);

    await expect(
      settle(waitForEndpointPackage(kbnClient, esClient, new ToolingLog(), 60_000))
    ).resolves.toBeUndefined();
  });
});

describe('waitForTransformPropagation', () => {
  it('counts only united docs that endpoint lookups can see', async () => {
    const count = jest.fn().mockResolvedValue({ count: 2 });
    const esClient = { count } as unknown as Client;

    await waitForTransformPropagation(
      esClient,
      new ToolingLog(),
      { metadataCurrent: 2, metadataUnited: 2 },
      1_000,
      'eval-agent-era-'
    );

    const queryFor = (index: string) =>
      count.mock.calls.find(([request]) => request.index === index)?.[0].query;

    expect(queryFor(metadataCurrentIndexPattern)).toEqual({
      prefix: { 'agent.id': 'eval-agent-era-' },
    });
    // A prefix-only count passes once the transform writes a half-merged doc,
    // which list/resolve tools still filter out.
    expect(queryFor(METADATA_UNITED_INDEX)).toMatchObject({
      bool: {
        filter: expect.arrayContaining([
          { prefix: { 'agent.id': 'eval-agent-era-' } },
          expect.objectContaining({
            bool: expect.objectContaining({
              filter: expect.arrayContaining([
                { exists: { field: 'united.endpoint.agent.id' } },
                { exists: { field: 'united.agent.agent.id' } },
                { term: { 'united.agent.active': { value: true } } },
              ]),
            }),
          }),
        ]),
      },
    });
  });
});

// Both halves of the contract are asserted: omitting the field is the original
// bug (hosts merged from one side), adding it to the metadata doc is the
// regression that kills the `metadata_current` transform.
describe('endpoint_data seeded documents', () => {
  it('stamps `updated_at` on the agent doc only', async () => {
    const create = jest.fn().mockResolvedValue({ result: 'created' });
    const index = jest.fn().mockResolvedValue({ result: 'created' });
    const clients = {
      esClient: { create },
      internalEsClient: { index },
    } as unknown as Parameters<typeof seedScenario>[0];

    await seedScenario(clients, {
      agentId: 'eval-agent-era-1',
      hostName: 'era-seed-test-host',
      os: { name: 'Windows', version: '11' },
      policyName: 'era-seed-test-policy',
      policyStatus: 'success',
      policyId: 'era-seed-test-policy-id',
    });

    const metadataDoc = create.mock.calls[0][0].document;
    const agentDoc = index.mock.calls[0][0].document;
    expect(agentDoc.updated_at).toEqual(agentDoc['@timestamp']);
    expect(metadataDoc).not.toHaveProperty('updated_at');
  });
});

// The endpoint actions data streams type `error` as an ECS object; a bare
// string fails index-time validation and breaks both suites' setup.
describe('endpoint_data seeded isolation failure documents', () => {
  const extraDocs = SCENARIOS.routingUnhealthyHost.extraDocuments ?? [];

  it('seeds the failed isolate action with an error object carrying a message', () => {
    const actionDoc = extraDocs.find((doc) => doc.index === '.logs-endpoint.actions-default');
    expect(actionDoc).toBeDefined();
    expect(actionDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });

  it('seeds the failed isolate action response with an error object carrying a message', () => {
    const responseDoc = extraDocs.find(
      (doc) => doc.index === '.logs-endpoint.action.responses-default'
    );
    expect(responseDoc).toBeDefined();
    expect(responseDoc?.document.error).toEqual({
      message: expect.any(String),
    });
  });
});
