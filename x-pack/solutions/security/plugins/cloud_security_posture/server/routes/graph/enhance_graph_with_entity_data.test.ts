/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GraphResponse } from '@kbn/cloud-security-posture-common/types/graph/v1';
import type { MappedAssetProps } from '@kbn/cloud-security-posture-common/types/assets';
import {
  enhanceGraphWithEntityData,
  mapEntityDataToNodeProps,
  MappedNodeProps,
  type NodeFieldsMapping,
} from './enhance_graph_with_entity_data';

jest.mock('./fetch_graph');
jest.mock('./parse_records');
jest.mock('./fetch_entity_data');

const mockLoggerFactory = loggingSystemMock.create();
const mockLogger = mockLoggerFactory.get('mock logger');

describe('getGraph', () => {
  let esClient: any;
  let uiSettings: any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enhance graph data with entity information - icons not mapped', async () => {
    // Create mock graph data with three different node types:
    // 1. Node without documentsData
    // 2. Node with documentsData and matching ID
    // 3. Node with documentsData but non-matching ID
    const mockGraphData: Pick<GraphResponse, 'nodes' | 'edges' | 'messages'> = {
      nodes: [
        // Node without documentsData
        { id: 'node1', label: 'Node 1', color: 'primary', shape: 'ellipse' },
        {
          id: 'node2',
          label: 'Node 2',
          color: 'primary',
          shape: 'hexagon',
          documentsData: [
            {
              id: 'node2',
              type: 'event',
            },
          ],
        },
        {
          id: 'node3',
          label: 'Node 3',
          color: 'primary',
          shape: 'diamond',
          documentsData: [
            {
              id: 'different-id',
              type: 'event',
            },
          ],
        },
      ],
      edges: [],
    };

    // Call the function with asset inventory enabled
    const result = await enhanceGraphWithEntityData({
      logger: mockLogger,
      graphData: mockGraphData,
      esClient: mockEsClient,
      spaceId: 'default',
    });
    expect(parseRecords).toHaveBeenCalledWith(mockLogger, fakeFetchResult.records, 10);
    expect(uiSettings.client.get).toHaveBeenCalledWith(
      SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING
    );

    // Call the function with asset inventory enabled
    const result = await enhanceGraphWithEntityData({
      logger: mockLogger,
      graphData: mockGraphData,
      esClient: mockEsClient,
      spaceId: 'default',
    });

    // Verify the result - check that entity types are mapped to correct icons
    expect(result).toEqual({
      nodes: [
        {
          id: 'node1',
          label: 'Entity node1',
          color: 'primary',
          shape: 'ellipse',
          icon: 'globe', // IP should map to globe icon
        },
        {
          id: 'node2',
          label: 'Entity node2',
          color: 'primary',
          shape: 'hexagon',
          icon: 'kubernetesNode', // kubernetes container should map to kubernetesNode icon
        },
      ],
      edges: [],
    });
  });

  it('should use default indexPatterns if not provided', async () => {
    const fakeFetchResult = { records: [] };
    (fetchGraph as jest.Mock).mockResolvedValue(fakeFetchResult);

    const parsedResult = { nodes: [], edges: [], messages: [] };
    (parseRecords as jest.Mock).mockReturnValue(parsedResult);

    const params = {
      services: { esClient, logger: mockLogger, uiSettings },
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

    // Call the function
    const result = await enhanceGraphWithEntityData({
      logger: mockLogger,
      graphData: mockGraphData,
      esClient: mockEsClient,
      spaceId: 'default',
    });

    expect(fetchGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        indexPatterns: ['logs-*'],
      })
    );
  });
});
