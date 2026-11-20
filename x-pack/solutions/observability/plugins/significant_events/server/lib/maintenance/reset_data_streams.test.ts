/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventsMaintenanceFailure } from '../../../common/maintenance/types';
import { KNOWLEDGE_INDICATORS_DATA_STREAM } from '../knowledge_indicators/data_stream';
import { DETECTIONS_DATA_STREAM } from '../significant_events/detections/data_stream';
import { DISCOVERIES_DATA_STREAM } from '../significant_events/discoveries_data_stream';
import { REQUEST, makeService, makeManagementApi } from './maintenance_service.test_helpers';
import { prepareDataStreamsForReset, resetDataStreams } from './reset_data_streams';

describe('space-scoped data stream reset', () => {
  it('removes all matching revisions and markers, preserving another space and untagged legacy data', async () => {
    const fixture = makeService({ management: makeManagementApi().api });
    const documents = [
      { id: 'shared-id', space: 'default', kind: 'feature' },
      { id: 'shared-id', space: 'default', kind: 'expired-feature' },
      { id: 'shared-id', space: 'default', kind: 'excluded-feature' },
      { id: 'shared-id', space: 'default', kind: 'tombstone' },
      { id: 'query', space: 'default', kind: 'query' },
      { id: 'detection', space: 'default', kind: 'processed-marker' },
      { id: 'shared-id', space: 'other', kind: 'feature' },
      { id: 'legacy', space: undefined, kind: 'feature' },
    ];
    fixture.esClient.deleteByQuery.mockImplementation(async ({ query }) => {
      const before = documents.length;
      for (let i = documents.length - 1; i >= 0; i--) {
        if (documents[i].space === query.term['kibana.space_ids']) documents.splice(i, 1);
      }
      return {
        deleted: before - documents.length,
        failures: [],
        timed_out: false,
        version_conflicts: 0,
      };
    });

    await fixture.service.reset({ request: REQUEST });

    expect(documents).toEqual([
      { id: 'shared-id', space: 'other', kind: 'feature' },
      { id: 'legacy', space: undefined, kind: 'feature' },
    ]);
    expect(fixture.esClient.indices.deleteDataStream).not.toHaveBeenCalled();
    expect(fixture.internalEsClient.indices.createDataStream).not.toHaveBeenCalled();
  });

  it.each([
    { failures: [{ cause: { reason: 'write blocked' } }], version_conflicts: 0, timed_out: false },
    { failures: [], version_conflicts: 2, timed_out: false },
    { failures: [], version_conflicts: 0, timed_out: true },
  ])('reports incomplete deletion without confirming logical KI counts: %o', async (result) => {
    const { service, esClient } = makeService({
      management: makeManagementApi().api,
      knowledgeIndicatorCounts: { feature: 10, query: 5 },
    });
    esClient.deleteByQuery.mockImplementation(async ({ index }) => ({
      deleted: index === KNOWLEDGE_INDICATORS_DATA_STREAM ? 2 : 0,
      ...(index === KNOWLEDGE_INDICATORS_DATA_STREAM
        ? result
        : { failures: [], timed_out: false, version_conflicts: 0 }),
    }));

    const summary = await service.reset({ request: REQUEST });

    expect(summary.deleted).toMatchObject({
      knowledgeIndicators: 0,
      storedQueries: 0,
      dataStreams: 1,
    });
    expect(summary.partialFailures).toEqual([
      {
        target: `data-stream:${KNOWLEDGE_INDICATORS_DATA_STREAM}:delete`,
        error: expect.any(String),
      },
    ]);
  });

  it('continues other streams after caller deletion fails, without using an internal delete client', async () => {
    const { service, esClient, internalEsClient } = makeService({
      management: makeManagementApi().api,
    });
    esClient.deleteByQuery.mockRejectedValueOnce(new Error('delete denied'));

    const summary = await service.reset({ request: REQUEST });

    expect(summary.partialFailures).toContainEqual({
      target: `data-stream:${DETECTIONS_DATA_STREAM}:delete`,
      error: 'delete denied',
    });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      expect.objectContaining({ index: KNOWLEDGE_INDICATORS_DATA_STREAM })
    );
    expect(internalEsClient.deleteByQuery).not.toHaveBeenCalled();
  });

  it('does not create a missing discoveries stream or select an unprepared stream', async () => {
    const { esClient, internalEsClient, initializeClient } = makeService();
    const failures: SignificantEventsMaintenanceFailure[] = [];
    const prepared = await prepareDataStreamsForReset({
      esClient: esClient as never,
      internalEsClient: internalEsClient as never,
      dataStreams: { initializeClient } as never,
      failures,
    });
    expect(prepared.has(DISCOVERIES_DATA_STREAM)).toBe(false);
    await resetDataStreams({
      esClient: esClient as never,
      spaceId: REQUEST.spaceId,
      preparedStreams: new Set(),
      failures,
    });
    expect(esClient.deleteByQuery).not.toHaveBeenCalled();
    expect(failures).toEqual([]);
  });
});
