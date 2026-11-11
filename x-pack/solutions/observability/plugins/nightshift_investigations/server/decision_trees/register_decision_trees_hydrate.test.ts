/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { embedAccessedTreesMarker } from './accessed_trees';
import { materializeDecisionTrees } from './materialize';
import { hydrateDecisionTreeWorkspace } from './register_decision_trees';
import { NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE } from '../telemetry';
import { hashTreeId } from '../telemetry/hash_tree_id';

jest.mock('./store', () => ({ createDecisionTreeStore: jest.fn().mockReturnValue({}) }));
jest.mock('./materialize', () => ({ materializeDecisionTrees: jest.fn() }));

const materialize = jest.mocked(materializeDecisionTrees);

describe('hydrateDecisionTreeWorkspace load telemetry', () => {
  const analytics = coreMock.createSetup().analytics;

  const hydrate = (prompt?: string) =>
    hydrateDecisionTreeWorkspace({
      session: {} as never,
      esClient: {} as never,
      logger: loggerMock.create(),
      spaceId: 'default',
      prompt,
      analytics,
      conversationId: 'conv-1',
      roundId: 'round-1',
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports a discover load without ids when the prompt has no marker', async () => {
    materialize.mockResolvedValue([{ tree_id: 'symptom:a' }, { tree_id: 'symptom:b' }] as never);

    await hydrate('plain investigation prompt');

    expect(materialize).toHaveBeenCalledWith(
      expect.not.objectContaining({ treeIds: expect.anything() })
    );
    expect(analytics.reportEvent).toHaveBeenCalledTimes(1);
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
      {
        conversation_id: 'conv-1',
        round_id: 'round-1',
        selection: 'discover',
        tree_count: 2,
        tree_ids: [],
      }
    );
  });

  it('reports an accessed load with the hashed ids that were materialized', async () => {
    materialize.mockResolvedValue([{ tree_id: 'symptom:a' }] as never);

    await hydrate(`${embedAccessedTreesMarker(['symptom:a', 'symptom:b'])}\nreinforce`);

    expect(materialize).toHaveBeenCalledWith(
      expect.objectContaining({ treeIds: ['symptom:a', 'symptom:b'] })
    );
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
      {
        conversation_id: 'conv-1',
        round_id: 'round-1',
        selection: 'accessed',
        tree_count: 1,
        tree_ids: [hashTreeId('symptom:a')],
      }
    );
  });

  it('reports an accessed load with no trees for an empty selection', async () => {
    materialize.mockResolvedValue([]);

    await hydrate(`${embedAccessedTreesMarker([])}\nreinforce`);

    expect(materialize).toHaveBeenCalledWith(expect.objectContaining({ treeIds: [] }));
    expect(analytics.reportEvent).toHaveBeenCalledWith(
      NIGHTSHIFT_DECISION_TREES_LOADED_EVENT_TYPE,
      {
        conversation_id: 'conv-1',
        round_id: 'round-1',
        selection: 'accessed',
        tree_count: 0,
        tree_ids: [],
      }
    );
  });

  it('reports no load when materialization fails', async () => {
    materialize.mockRejectedValue(new Error('sandbox write failed'));

    await expect(hydrate()).rejects.toThrow('sandbox write failed');

    expect(analytics.reportEvent).not.toHaveBeenCalled();
  });
});
