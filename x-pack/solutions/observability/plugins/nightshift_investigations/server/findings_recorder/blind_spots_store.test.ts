/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import {
  BLIND_SPOTS_INDEX,
  createBlindSpotsStore,
  resetBlindSpotsIndexCheck,
} from './blind_spots_store';

const document = {
  conversation_id: 'c1',
  '@timestamp': '2026-11-12T10:00:00.000Z',
  outcome: 'cause_not_confirmed' as const,
  missing_data: [{ what: 'SLO definition', why: 'no_access' as const }],
  hypotheses: [
    { candidate: 'bad deploy', status: 'investigating' as const, settled_by: 'Refuted if x' },
  ],
};

describe('createBlindSpotsStore', () => {
  const setup = () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const store = createBlindSpotsStore({
      esClient,
      logger: loggingSystemMock.createLogger(),
      spaceId: 'ops',
    });
    return { esClient, store };
  };

  beforeEach(() => resetBlindSpotsIndexCheck());

  it('creates the index with a strict mapping, then indexes one document per investigation', async () => {
    const { esClient, store } = setup();

    await store.save(document);

    expect(esClient.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        index: BLIND_SPOTS_INDEX,
        settings: expect.objectContaining({ hidden: true }),
        mappings: expect.objectContaining({ dynamic: 'strict' }),
      })
    );
    expect(esClient.index).toHaveBeenCalledWith({
      index: BLIND_SPOTS_INDEX,
      id: 'c1',
      document: { ...document, space_id: 'ops' },
    });
  });

  it('creates the index once, and treats one that already exists as ready', async () => {
    const { esClient, store } = setup();
    esClient.indices.create.mockRejectedValueOnce({
      body: { error: { type: 'resource_already_exists_exception' } },
    });

    await store.save(document);
    await store.save({ ...document, conversation_id: 'c2' });

    expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    expect(esClient.index).toHaveBeenCalledTimes(2);
  });

  it('does not write when the index cannot be created', async () => {
    const { esClient, store } = setup();
    esClient.indices.create.mockRejectedValueOnce(new Error('security_exception'));

    await expect(store.save(document)).rejects.toThrow('security_exception');
    expect(esClient.index).not.toHaveBeenCalled();
  });
});
