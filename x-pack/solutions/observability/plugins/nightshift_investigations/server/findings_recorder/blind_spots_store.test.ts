/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { BLIND_SPOTS_INDEX, createBlindSpotsStore } from './blind_spots_store';

const mockIndex = jest.fn();

jest.mock('@kbn/storage-adapter', () => ({
  ...jest.requireActual('@kbn/storage-adapter'),
  StorageIndexAdapter: jest.fn().mockImplementation(() => ({
    getClient: () => ({ index: mockIndex }),
  })),
}));

describe('createBlindSpotsStore', () => {
  it('indexes one document per investigation, tagged with the space', async () => {
    const store = createBlindSpotsStore({
      esClient: elasticsearchServiceMock.createElasticsearchClient(),
      logger: loggingSystemMock.createLogger(),
      spaceId: 'ops',
    });

    await store.save({
      conversation_id: 'c1',
      '@timestamp': '2026-11-12T10:00:00.000Z',
      outcome: 'cause_not_confirmed',
      missing_data: [{ what: 'SLO definition', why: 'no_access' }],
      hypotheses: [
        { candidate: 'bad deploy', status: 'investigating', settled_by: 'Refuted if x' },
      ],
    });

    expect(mockIndex).toHaveBeenCalledWith({
      id: 'c1',
      document: expect.objectContaining({
        conversation_id: 'c1',
        space_id: 'ops',
        outcome: 'cause_not_confirmed',
      }),
    });
    expect(BLIND_SPOTS_INDEX).toBe('.chat-nightshift-blind-spots');
  });
});
