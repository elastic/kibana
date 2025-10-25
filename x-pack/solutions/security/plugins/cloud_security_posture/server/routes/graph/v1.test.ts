/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { getGraph, type GetGraphParams } from './v1';
import { fetchGraph } from './fetch_graph';
import { parseRecords } from './parse_records';
import { getDefaultIndexPatterns } from './constants';

jest.mock('./fetch_graph');
jest.mock('./parse_records');

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

describe('getGraph', () => {
  let esClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    esClient = {};
  });

  it('should call fetchGraph and parseRecords with correct parameters', async () => {
    const fakeFetchResult = { records: ['record1', 'record2'] };
    (fetchGraph as jest.Mock).mockResolvedValue(fakeFetchResult);

    const parsedResult = { nodes: ['node1'], edges: ['edge1'], messages: ['msg1'] };
    (parseRecords as jest.Mock).mockReturnValue(parsedResult);

    const params = {
      services: { esClient, logger: mockLogger },
      query: {
        originEventIds: [
          { id: 'event1', isAlert: false },
          { id: 'event2', isAlert: false },
        ],
        spaceId: 'testSpace',
        indexPatterns: ['pattern1', 'pattern2'],
        start: 0,
        end: 100,
        esQuery: { bool: { must: [{ match_phrase: { field: 'value' } }] } },
      },
      showUnknownTarget: true,
      nodesLimit: 10,
    } satisfies GetGraphParams;

    const result = await getGraph(params);

    expect(fetchGraph).toHaveBeenCalledWith({
      esClient,
      showUnknownTarget: true,
      logger: mockLogger,
      start: 0,
      end: 100,
      eventTimeStart: undefined,
      eventTimeEnd: undefined,
      originEventIds: params.query.originEventIds,
      indexPatterns: ['pattern1', 'pattern2'],
      spaceId: 'testSpace',
      esQuery: { bool: { must: [{ match_phrase: { field: 'value' } }] } },
    });
    expect(parseRecords).toHaveBeenCalledWith(mockLogger, fakeFetchResult.records, 10);
    expect(result).toEqual(parsedResult);
  });

  it('should use default indexPatterns if not provided', async () => {
    const fakeFetchResult = { records: [] };
    (fetchGraph as jest.Mock).mockResolvedValue(fakeFetchResult);

    const parsedResult = { nodes: [], edges: [], messages: [] };
    (parseRecords as jest.Mock).mockReturnValue(parsedResult);

    const params = {
      services: { esClient, logger: mockLogger },
      query: {
        originEventIds: [{ id: 'event3', isAlert: false }],
        // No indexPatterns provided; spaceId will be used to build default patterns.
        spaceId: 'defaultSpace',
        start: '2020-01-01',
        end: '2020-01-02',
        esQuery: { bool: { must: [{ match_phrase: { field: 'value' } }] } },
      },
      showUnknownTarget: false,
    } satisfies GetGraphParams;

    await getGraph(params);

    expect(fetchGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        indexPatterns: getDefaultIndexPatterns('defaultSpace'),
      })
    );
  });

  it('should pass originalTime and eventTime parameters when provided', async () => {
    const fakeFetchResult = { records: ['record1', 'record2'] };
    (fetchGraph as jest.Mock).mockResolvedValue(fakeFetchResult);

    const parsedResult = { nodes: ['node1', 'node2'], edges: ['edge1'], messages: [] };
    (parseRecords as jest.Mock).mockReturnValue(parsedResult);

    const originEventIds = [
      { id: 'alert1', isAlert: true, originalTime: '2025-01-15T10:00:00.000Z' },
      { id: 'alert2', isAlert: true, originalTime: '2025-01-15T14:00:00.000Z' },
      { id: 'event1', isAlert: false },
    ];

    const params = {
      services: { esClient, logger: mockLogger },
      query: {
        originEventIds,
        spaceId: 'production',
        start: '2025-01-15T09:30:00.000Z',
        end: '2025-01-15T14:30:00.000Z',
        eventTimeStart: '2025-01-15T10:00:00.000Z||-30m',
        eventTimeEnd: '2025-01-15T14:00:00.000Z||+30m',
      },
      showUnknownTarget: false,
      nodesLimit: 100,
    } satisfies GetGraphParams;

    await getGraph(params);

    expect(fetchGraph).toHaveBeenCalledWith({
      esClient,
      showUnknownTarget: false,
      logger: mockLogger,
      start: '2025-01-15T09:30:00.000Z',
      end: '2025-01-15T14:30:00.000Z',
      eventTimeStart: '2025-01-15T10:00:00.000Z||-30m',
      eventTimeEnd: '2025-01-15T14:00:00.000Z||+30m',
      originEventIds,
      indexPatterns: getDefaultIndexPatterns('production'),
      spaceId: 'production',
      esQuery: undefined,
    });
    expect(parseRecords).toHaveBeenCalledWith(mockLogger, fakeFetchResult.records, 100);
  });

  it('should work without eventTime parameters for backward compatibility', async () => {
    const fakeFetchResult = { records: ['record1'] };
    (fetchGraph as jest.Mock).mockResolvedValue(fakeFetchResult);

    const parsedResult = { nodes: ['node1'], edges: [], messages: [] };
    (parseRecords as jest.Mock).mockReturnValue(parsedResult);

    const params = {
      services: { esClient, logger: mockLogger },
      query: {
        originEventIds: [{ id: 'event1', isAlert: false }],
        start: '2025-01-15T09:00:00.000Z',
        end: '2025-01-15T11:00:00.000Z',
      },
      showUnknownTarget: true,
    } satisfies GetGraphParams;

    await getGraph(params);

    expect(fetchGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTimeStart: undefined,
        eventTimeEnd: undefined,
      })
    );
  });
});
