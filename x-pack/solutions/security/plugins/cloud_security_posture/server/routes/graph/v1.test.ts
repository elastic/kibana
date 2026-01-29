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
    const fakeFetchResult = { events: ['event1', 'event2'], relationships: [] };
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
      logger: mockLogger,
      start: 0,
      end: 100,
      originEventIds: [
        { id: 'event1', isAlert: false },
        { id: 'event2', isAlert: false },
      ],
      showUnknownTarget: true,
      indexPatterns: ['pattern1', 'pattern2'],
      spaceId: 'testSpace',
      esQuery: { bool: { must: [{ match_phrase: { field: 'value' } }] } },
      entityIds: undefined,
    });
    expect(parseRecords).toHaveBeenCalledWith(
      mockLogger,
      fakeFetchResult.events,
      fakeFetchResult.relationships,
      10
    );
    expect(result).toEqual(parsedResult);
  });

  it('should use default indexPatterns if not provided', async () => {
    const fakeFetchResult = { events: [], relationships: [] };
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
        indexPatterns: [`.alerts-security.alerts-defaultSpace`, 'logs-*'],
      })
    );
  });
});
