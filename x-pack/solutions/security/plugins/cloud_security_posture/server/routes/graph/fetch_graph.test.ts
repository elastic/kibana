/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { fetchGraph } from './fetch_graph';
import { fetchEvents } from './fetch_events_graph';
import { fetchEntityRelationships } from './fetch_entity_relationships_graph';
import type { EventEdge, RelationshipEdge } from './types';

jest.mock('./fetch_events_graph');
jest.mock('./fetch_entity_relationships_graph');

const mockedFetchEvents = fetchEvents as jest.MockedFunction<typeof fetchEvents>;
const mockedFetchEntityRelationships = fetchEntityRelationships as jest.MockedFunction<
  typeof fetchEntityRelationships
>;

describe('fetchGraph', () => {
  const esClient = elasticsearchServiceMock.createScopedClusterClient();
  const logger = loggingSystemMock.createLogger();

  const baseParams = {
    esClient,
    logger,
    start: '2024-01-01T00:00:00.000Z',
    end: '2024-01-02T00:00:00.000Z',
    originEventIds: [{ id: 'event-1', isAlert: false }],
    showUnknownTarget: false,
    indexPatterns: ['logs-*'],
    spaceId: 'default',
  };

  const mockEventRecords: EventEdge[] = [
    {
      badge: 1,
      action: 'test-action',
      actorNodeId: 'actor-1',
      actorIdsCount: 1,
      targetNodeId: 'target-1',
      targetIdsCount: 1,
      docs: ['doc-1'],
      isAlert: false,
      isOrigin: true,
      isOriginAlert: false,
      uniqueEventsCount: 1,
      uniqueAlertsCount: 0,
      labelNodeId: 'label-1',
    },
  ];

  const mockRelationshipRecords: RelationshipEdge[] = [
    {
      badge: 1,
      relationship: 'Owns',
      relationshipNodeId: 'actor-1-Owns',
      actorNodeId: 'actor-1',
      actorIdsCount: 1,
      actorIds: ['actor-1'],
      targetNodeId: 'target-1',
      targetIdsCount: 1,
      targetIds: ['target-1'],
    },
  ];

  beforeEach(() => {
    mockedFetchEvents.mockResolvedValue({
      records: mockEventRecords,
    } as any);
    mockedFetchEntityRelationships.mockResolvedValue({
      columns: [],
      records: mockRelationshipRecords,
    } as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call fetchEvents with correct parameters', async () => {
    await fetchGraph(baseParams);

    expect(mockedFetchEvents).toHaveBeenCalledTimes(1);
    expect(mockedFetchEvents).toHaveBeenCalledWith({
      esClient,
      logger,
      start: baseParams.start,
      end: baseParams.end,
      originEventIds: baseParams.originEventIds,
      showUnknownTarget: baseParams.showUnknownTarget,
      indexPatterns: baseParams.indexPatterns,
      spaceId: baseParams.spaceId,
      esQuery: undefined,
    });
  });

  it('should return events from fetchEvents', async () => {
    const result = await fetchGraph(baseParams);

    expect(result.events).toEqual(mockEventRecords);
  });

  it('should not call fetchEntityRelationships when entityIds is undefined', async () => {
    await fetchGraph(baseParams);

    expect(mockedFetchEntityRelationships).not.toHaveBeenCalled();
  });

  it('should not call fetchEntityRelationships when entityIds is empty', async () => {
    await fetchGraph({ ...baseParams, entityIds: [] });

    expect(mockedFetchEntityRelationships).not.toHaveBeenCalled();
  });

  it('should return empty relationships when entityIds is not provided', async () => {
    const result = await fetchGraph(baseParams);

    expect(result.relationships).toEqual([]);
  });

  it('should not call fetchEvents when originEventIds is empty and no esQuery', async () => {
    const entityIds = [{ id: 'entity-1', isOrigin: true }];

    await fetchGraph({ ...baseParams, originEventIds: [], entityIds });

    expect(mockedFetchEvents).not.toHaveBeenCalled();
  });

  it('should return empty events when originEventIds is empty and no esQuery', async () => {
    const entityIds = [{ id: 'entity-1', isOrigin: true }];

    const result = await fetchGraph({ ...baseParams, originEventIds: [], entityIds });

    expect(result.events).toEqual([]);
  });

  it('should call fetchEvents when originEventIds is empty but esQuery is provided', async () => {
    const esQuery = {
      bool: {
        filter: [{ term: { 'cloud.provider': 'gcp' } }],
        must: [],
        should: [],
        must_not: [],
      },
    };

    await fetchGraph({ ...baseParams, originEventIds: [], esQuery });

    expect(mockedFetchEvents).toHaveBeenCalledTimes(1);
  });

  it('should call fetchEntityRelationships when entityIds are provided', async () => {
    const entityIds = [
      { id: 'entity-1', isOrigin: true },
      { id: 'entity-2', isOrigin: false },
    ];

    await fetchGraph({ ...baseParams, entityIds });

    expect(mockedFetchEntityRelationships).toHaveBeenCalledTimes(1);
    expect(mockedFetchEntityRelationships).toHaveBeenCalledWith({
      esClient,
      logger,
      entityIds,
      spaceId: 'default',
    });
  });

  it('should return relationships from fetchEntityRelationships', async () => {
    const entityIds = [{ id: 'entity-1', isOrigin: true }];

    const result = await fetchGraph({ ...baseParams, entityIds });

    expect(result.relationships).toEqual(mockRelationshipRecords);
  });

  it('should pass esQuery to fetchEvents when provided', async () => {
    const esQuery = {
      bool: {
        filter: [{ term: { 'cloud.provider': 'gcp' } }],
        must: [],
        should: [],
        must_not: [],
      },
    };

    await fetchGraph({ ...baseParams, esQuery });

    expect(mockedFetchEvents).toHaveBeenCalledWith(expect.objectContaining({ esQuery }));
  });

  it('should log and re-throw when fetchEvents fails', async () => {
    const error = new Error('ESQL query failed');
    mockedFetchEvents.mockRejectedValue(error);

    await expect(fetchGraph(baseParams)).rejects.toThrow('ESQL query failed');
    expect(logger.error).toHaveBeenCalledWith('Failed to fetch events: ESQL query failed');
  });

  it('should log and re-throw when fetchEntityRelationships fails', async () => {
    const entityIds = [{ id: 'entity-1', isOrigin: true }];
    const error = new Error('Connection refused');
    mockedFetchEntityRelationships.mockRejectedValue(error);

    await expect(fetchGraph({ ...baseParams, entityIds })).rejects.toThrow('Connection refused');
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch entity relationships: Connection refused'
    );
  });
});
