/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { METADATA_UNITED_INDEX, metadataCurrentIndexPattern } from '../constants';
import { startMetadataTransforms } from './transforms';

const alreadyExistsError = Object.assign(new Error('resource_already_exists_exception'), {
  statusCode: 400,
  body: {
    error: {
      type: 'resource_already_exists_exception',
      reason: 'task with id {endpoint.metadata_current-default-9.6.0} already exist',
    },
  },
});

const CURRENT_TRANSFORM_ID = 'endpoint.metadata_current-default-9.6.0';
const UNITED_TRANSFORM_ID = 'endpoint.metadata_united-default-9.6.0';

const metadataSearchResult = (distinctAgents: number) => ({
  hits: { total: distinctAgents },
  aggregations: { agents: { value: distinctAgents } },
});

const createEsClient = (startTransform: jest.Mock, search?: jest.Mock): Client =>
  ({
    transform: {
      getTransformStats: jest.fn().mockResolvedValue({
        transforms: [{ id: CURRENT_TRANSFORM_ID }, { id: UNITED_TRANSFORM_ID }],
      }),
      startTransform,
    },
    search: search ?? jest.fn().mockResolvedValue(metadataSearchResult(1)),
  } as unknown as Client);

describe('startMetadataTransforms', () => {
  it('treats a transform task that already exists as already started', async () => {
    const startTransform = jest.fn().mockRejectedValue(alreadyExistsError);

    await expect(
      startMetadataTransforms(createEsClient(startTransform), ['agent-1'], '9.6.0')
    ).resolves.toBeUndefined();

    expect(startTransform).toHaveBeenCalledWith({
      transform_id: CURRENT_TRANSFORM_ID,
    });
    expect(startTransform).toHaveBeenCalledWith({
      transform_id: UNITED_TRANSFORM_ID,
    });
  });

  it('treats a transform task reported on meta.body as already started', async () => {
    const startTransform = jest.fn().mockRejectedValue(
      Object.assign(new Error('resource_already_exists_exception'), {
        statusCode: 400,
        meta: {
          body: {
            error: {
              type: 'resource_already_exists_exception',
              reason: 'task with id {endpoint.metadata_current-default-9.6.0} already exist',
            },
          },
        },
      })
    );

    await expect(
      startMetadataTransforms(createEsClient(startTransform), ['agent-1'], '9.6.0')
    ).resolves.toBeUndefined();

    expect(startTransform).toHaveBeenCalledWith({ transform_id: CURRENT_TRANSFORM_ID });
    expect(startTransform).toHaveBeenCalledWith({ transform_id: UNITED_TRANSFORM_ID });
  });

  it('restarts a transform until each metadata index has the agent', async () => {
    jest.useFakeTimers();
    const callsByIndex = new Map<string, number>();
    const search = jest.fn(async ({ index }: { index: string }) => {
      const calls = (callsByIndex.get(index) ?? 0) + 1;
      callsByIndex.set(index, calls);
      return metadataSearchResult(calls >= 2 ? 1 : 0);
    });
    const startTransform = jest.fn().mockResolvedValue({});
    const pending = startMetadataTransforms(
      createEsClient(startTransform, search),
      ['agent-1'],
      '9.6.0'
    );

    try {
      await jest.runAllTimersAsync();
      await expect(pending).resolves.toBeUndefined();
    } finally {
      jest.useRealTimers();
    }

    expect(startTransform.mock.calls.map(([params]) => params.transform_id)).toEqual([
      CURRENT_TRANSFORM_ID,
      CURRENT_TRANSFORM_ID,
      UNITED_TRANSFORM_ID,
      UNITED_TRANSFORM_ID,
    ]);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: metadataCurrentIndexPattern,
        query: { bool: { filter: [{ terms: { 'agent.id': ['agent-1'] } }] } },
      })
    );
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: METADATA_UNITED_INDEX,
        query: {
          bool: {
            filter: [
              { terms: { 'united.endpoint.agent.id': ['agent-1'] } },
              { term: { 'united.agent.active': { value: true } } },
            ],
          },
        },
      })
    );
  });

  it('rejects when the united index never has the agent', async () => {
    jest.useFakeTimers();
    const search = jest.fn(async ({ index }: { index: string }) =>
      metadataSearchResult(index === METADATA_UNITED_INDEX ? 0 : 1)
    );
    const startTransform = jest.fn().mockResolvedValue({});
    const pending = startMetadataTransforms(
      createEsClient(startTransform, search),
      ['agent-1'],
      '9.6.0'
    );
    const assertion = expect(pending).rejects.toThrow(
      'Timed out waiting for 1 united endpoint metadata docs for agent ids [agent-1] (last distinct agent count: 0)'
    );

    try {
      await jest.runAllTimersAsync();
      await assertion;
    } finally {
      jest.useRealTimers();
    }

    expect(startTransform).toHaveBeenCalledWith({ transform_id: UNITED_TRANSFORM_ID });
  });
});
