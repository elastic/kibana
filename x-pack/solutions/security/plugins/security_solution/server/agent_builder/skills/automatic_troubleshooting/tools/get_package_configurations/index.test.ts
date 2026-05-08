/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  TransformGetTransformResponse,
  TransformGetTransformStatsResponse,
  IndicesGetSettingsResponse,
  IngestGetPipelineResponse,
  CatNodesResponse,
} from '@elastic/elasticsearch/lib/api/types';
import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import type { PackageClient } from '@kbn/fleet-plugin/server';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { createMockEndpointAppContext } from '../../../../../endpoint/mocks';
import { GET_PACKAGE_CONFIGURATIONS_TOOL_ID } from '../..';
import { getPackageConfigurationsTool } from '.';

describe('automaticTroubleshootingGetPackageConfigurationsTool', () => {
  let mockEndpointAppContextService: EndpointAppContextService;
  let mockPackageClient: PackageClient;
  let mockEsClient: ScopedClusterClientMock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEndpointAppContextService = createMockEndpointAppContext().service;
    mockPackageClient = mockEndpointAppContextService.getInternalFleetServices().packages;
    mockEsClient = elasticsearchServiceMock.createScopedClusterClient();
  });

  describe('tool definition', () => {
    it('returns a valid builtin tool definition', () => {
      const tool = getPackageConfigurationsTool(mockEndpointAppContextService);

      expect(tool).toBeDefined();
      expect(tool.type).toBe(ToolType.builtin);
      expect(tool.id).toBe(GET_PACKAGE_CONFIGURATIONS_TOOL_ID);
      expect(tool.description).toContain('Fetches Elastic Defend package configurations');
    });

    it('has correct tool id format', () => {
      expect(GET_PACKAGE_CONFIGURATIONS_TOOL_ID).toBe(
        'automatic_troubleshooting.get_package_configurations'
      );
    });
  });

  describe('handler', () => {
    let tool: ReturnType<typeof getPackageConfigurationsTool>;

    beforeEach(() => {
      tool = getPackageConfigurationsTool(mockEndpointAppContextService);
    });

    it('fetches all package configurations when installation exists', async () => {
      const mockInstallation = {
        name: 'endpoint',
        version: '9.4.0',
        install_version: '9.4.0',
        install_status: 'installed',
        install_started_at: '2024-01-01T00:00:00.000Z',
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [],
        installed_es: [],
        package_assets: [],
        es_index_patterns: {},
      } as Awaited<ReturnType<typeof mockPackageClient.getInstallation>>;

      const transformConfig = {
        _meta: { managed: true },
        source: { index: 'metrics-endpoint.metadata*' },
        dest: { index: 'metrics-endpoint.metadata_current' },
        frequency: '5m',
        sync: { time: { field: '@timestamp', delay: '60s' } },
      };

      const mockAssetsMap = new Map<string, Buffer>();
      mockAssetsMap.set(
        'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
        Buffer.from(JSON.stringify(transformConfig))
      );

      const mockPackageData = {
        assetsMap: mockAssetsMap,
        paths: ['elasticsearch/transform/metadata_current/default.json'],
        packageInfo: {
          name: 'endpoint',
          version: '9.4.0',
          title: 'Elastic Defend',
          description: 'Endpoint security package',
        },
      } as Awaited<ReturnType<typeof mockPackageClient.getPackage>>;

      (
        mockPackageClient as jest.Mocked<typeof mockPackageClient>
      ).getInstallation.mockResolvedValue(mockInstallation);
      (mockPackageClient as jest.Mocked<typeof mockPackageClient>).getPackage.mockResolvedValue(
        mockPackageData
      );

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 1,
        transforms: [
          {
            id: 'metrics-endpoint.metadata_current-default',
            source: { index: ['metrics-endpoint.metadata*'] },
            dest: { index: 'metrics-endpoint.metadata_current' },
            frequency: '5m',
            sync: { time: { field: '@timestamp', delay: '60s' } },
            settings: {},
            version: '9.4.0',
            create_time: 1234567890,
          },
        ],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 1,
        transforms: [
          {
            id: 'metrics-endpoint.metadata_current-default',
            state: 'started',
            stats: {
              pages_processed: 100,
              documents_processed: 1000,
              documents_indexed: 1000,
              trigger_count: 50,
              index_time_in_ms: 500,
              index_total: 1000,
              index_failures: 0,
              search_time_in_ms: 300,
              search_total: 100,
              search_failures: 0,
              processing_time_in_ms: 200,
              processing_total: 1000,
              exponential_avg_checkpoint_duration_ms: 100,
              exponential_avg_documents_indexed: 20,
              exponential_avg_documents_processed: 20,
            },
            checkpointing: {
              last: {
                checkpoint: 1,
                timestamp_millis: 1234567890,
              },
              changes_last_detected_at: 1234567890,
            },
          },
        ],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {
        'metrics-endpoint.metadata-default': {
          settings: {
            index: {
              number_of_shards: '1',
              number_of_replicas: '1',
              refresh_interval: '5s',
            },
          },
        },
      };

      const mockIngestPipelines: IngestGetPipelineResponse = {
        'metrics-endpoint.metadata@custom': {
          processors: [
            {
              set: {
                field: 'event.ingested',
                value: '{{_ingest.timestamp}}',
              },
            },
          ],
        },
      };

      const mockNodeStats: CatNodesResponse = [
        {
          ip: '127.0.0.1',
          'heap.percent': '50',
          'ram.percent': '60',
          cpu: '10',
          load_1m: '0.5',
          load_5m: '0.4',
          load_15m: '0.3',
          'node.role': 'h',
          master: '*',
          name: 'node-1',
        },
      ];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);
      const result = await tool.handler({}, {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext);

      expect(mockPackageClient.getInstallation).toHaveBeenCalledWith('endpoint');
      expect(mockPackageClient.getPackage).toHaveBeenCalledWith('endpoint', '9.4.0');
      expect(mockEsClient.asCurrentUser.transform.getTransform).toHaveBeenCalledWith({
        transform_id: 'endpoint.metadata_*',
      });
      expect(mockEsClient.asCurrentUser.transform.getTransformStats).toHaveBeenCalledWith({
        transform_id: 'endpoint.metadata_*',
      });
      expect(mockEsClient.asCurrentUser.indices.getSettings).toHaveBeenCalledWith({
        index: 'metrics-endpoint.metadata*',
      });
      expect(mockEsClient.asCurrentUser.ingest.getPipeline).toHaveBeenCalledWith({
        id: 'metrics-endpoint.metadata-*',
      });
      expect(mockEsClient.asCurrentUser.cat.nodes).toHaveBeenCalledWith({ v: true });

      if ('results' in result) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].type).toBe(ToolResultType.other);
        expect(result.results[0].data).toMatchObject({
          defaultTransformSettings: [
            {
              path: 'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
              config: transformConfig,
            },
          ],
          currentTransformSettings: mockTransformResponse.transforms,
          transformStats: mockTransformStatsResponse.transforms,
          indexSettings: mockIndexSettings,
          ingestPipelines: mockIngestPipelines,
          nodeStats: mockNodeStats,
        });
        expect(result.results[0]).toHaveProperty('tool_result_id');
        expect(typeof result.results[0].tool_result_id).toBe('string');
      }
    });

    it('handles case when package is not installed', async () => {
      (mockPackageClient.getInstallation as jest.Mock).mockResolvedValue(undefined);

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 0,
        transforms: [],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 0,
        transforms: [],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {};
      const mockIngestPipelines: IngestGetPipelineResponse = {};
      const mockNodeStats: CatNodesResponse = [];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);
      const result = await tool.handler({}, {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext);

      expect(mockPackageClient.getInstallation).toHaveBeenCalledWith('endpoint');
      expect(mockPackageClient.getPackage).not.toHaveBeenCalled();

      if ('results' in result) {
        expect(result.results).toHaveLength(1);
        expect(result.results[0].data).toMatchObject({
          defaultTransformSettings: [],
          currentTransformSettings: [],
          transformStats: [],
          indexSettings: {},
          ingestPipelines: {},
          nodeStats: [],
        });
      }
    });

    it('handles case when package has no transform assets', async () => {
      const mockInstallation = {
        name: 'endpoint',
        version: '9.4.0',
        install_version: '9.4.0',
        install_status: 'installed',
        install_started_at: '2024-01-01T00:00:00.000Z',
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [],
        installed_es: [],
        package_assets: [],
        es_index_patterns: {},
      } as Awaited<ReturnType<typeof mockPackageClient.getInstallation>>;

      const mockAssetsMap = new Map<string, Buffer>();
      mockAssetsMap.set('endpoint-9.4.0/kibana/dashboard/overview.json', Buffer.from('{}'));

      const mockPackageData = {
        assetsMap: mockAssetsMap,
        paths: ['kibana/dashboard/overview.json'],
        packageInfo: {
          name: 'endpoint',
          version: '9.4.0',
          title: 'Elastic Defend',
          description: 'Endpoint security package',
        },
      } as Awaited<ReturnType<typeof mockPackageClient.getPackage>>;

      (mockPackageClient.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);
      (mockPackageClient.getPackage as jest.Mock).mockResolvedValue(mockPackageData);

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 0,
        transforms: [],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 0,
        transforms: [],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {};
      const mockIngestPipelines: IngestGetPipelineResponse = {};
      const mockNodeStats: CatNodesResponse = [];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);

      const result = await tool.handler({}, {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext);

      if ('results' in result) {
        expect(result.results[0].data).toMatchObject({
          defaultTransformSettings: [],
        });
      }
    });

    it('handles multiple transform assets', async () => {
      const mockInstallation = {
        name: 'endpoint',
        version: '9.4.0',
        install_version: '9.4.0',
        install_status: 'installed',
        install_started_at: '2024-01-01T00:00:00.000Z',
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [],
        installed_es: [],
        package_assets: [],
        es_index_patterns: {},
      } as Awaited<ReturnType<typeof mockPackageClient.getInstallation>>;

      const transformConfig1 = { id: 'transform1', source: 'index1' };
      const transformConfig2 = { id: 'transform2', source: 'index2' };

      const mockAssetsMap = new Map<string, Buffer>();
      mockAssetsMap.set(
        'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
        Buffer.from(JSON.stringify(transformConfig1))
      );
      mockAssetsMap.set(
        'endpoint-9.4.0/elasticsearch/transform/metadata_united/default.json',
        Buffer.from(JSON.stringify(transformConfig2))
      );

      const mockPackageData = {
        assetsMap: mockAssetsMap,
        paths: [
          'elasticsearch/transform/metadata_current/default.json',
          'elasticsearch/transform/metadata_united/default.json',
        ],
        packageInfo: {
          name: 'endpoint',
          version: '9.4.0',
          title: 'Elastic Defend',
          description: 'Endpoint security package',
        },
      } as Awaited<ReturnType<typeof mockPackageClient.getPackage>>;

      (mockPackageClient.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);
      (mockPackageClient.getPackage as jest.Mock).mockResolvedValue(mockPackageData);

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 2,
        transforms: [
          {
            id: 'transform1',
            source: { index: ['index1'] },
            dest: { index: 'dest1' },
            frequency: '5m',
            sync: { time: { field: '@timestamp', delay: '60s' } },
            settings: {},
            version: '9.4.0',
            create_time: 1234567890,
          },
          {
            id: 'transform2',
            source: { index: ['index2'] },
            dest: { index: 'dest2' },
            frequency: '5m',
            sync: { time: { field: '@timestamp', delay: '60s' } },
            settings: {},
            version: '9.4.0',
            create_time: 1234567890,
          },
        ],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 2,
        transforms: [
          {
            id: 'transform1',
            state: 'started',
            stats: {
              pages_processed: 100,
              documents_processed: 1000,
              documents_indexed: 1000,
              trigger_count: 50,
              index_time_in_ms: 500,
              index_total: 1000,
              index_failures: 0,
              search_time_in_ms: 300,
              search_total: 100,
              search_failures: 0,
              processing_time_in_ms: 200,
              processing_total: 1000,
              exponential_avg_checkpoint_duration_ms: 100,
              exponential_avg_documents_indexed: 20,
              exponential_avg_documents_processed: 20,
            },
            checkpointing: {
              last: {
                checkpoint: 1,
                timestamp_millis: 1234567890,
              },
              changes_last_detected_at: 1234567890,
            },
          },
          {
            id: 'transform2',
            state: 'stopped',
            stats: {
              pages_processed: 50,
              documents_processed: 500,
              documents_indexed: 500,
              trigger_count: 25,
              index_time_in_ms: 250,
              index_total: 500,
              index_failures: 0,
              search_time_in_ms: 150,
              search_total: 50,
              search_failures: 0,
              processing_time_in_ms: 100,
              processing_total: 500,
              exponential_avg_checkpoint_duration_ms: 50,
              exponential_avg_documents_indexed: 10,
              exponential_avg_documents_processed: 10,
            },
            checkpointing: {
              last: {
                checkpoint: 1,
                timestamp_millis: 1234567890,
              },
              changes_last_detected_at: 1234567890,
            },
          },
        ],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {};
      const mockIngestPipelines: IngestGetPipelineResponse = {};
      const mockNodeStats: CatNodesResponse = [];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);
      const result = await tool.handler({}, {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext);

      if ('results' in result) {
        // @ts-expect-error
        expect(result.results[0].data.defaultTransformSettings).toHaveLength(2);
        // @ts-expect-error
        expect(result.results[0].data.defaultTransformSettings).toEqual([
          {
            path: 'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
            config: transformConfig1,
          },
          {
            path: 'endpoint-9.4.0/elasticsearch/transform/metadata_united/default.json',
            config: transformConfig2,
          },
        ]);
      }
    });

    it('uses asCurrentUser for Elasticsearch client calls', async () => {
      (mockPackageClient.getInstallation as jest.Mock).mockResolvedValue(undefined);

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 0,
        transforms: [],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 0,
        transforms: [],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {};
      const mockIngestPipelines: IngestGetPipelineResponse = {};
      const mockNodeStats: CatNodesResponse = [];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);
      const mockContext: ToolHandlerContext = {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext;

      await tool.handler({}, mockContext);

      expect(mockEsClient.asCurrentUser.transform.getTransform).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.transform.getTransformStats).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.indices.getSettings).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.ingest.getPipeline).toHaveBeenCalled();
      expect(mockEsClient.asCurrentUser.cat.nodes).toHaveBeenCalled();
    });

    it('parses transform JSON configurations correctly', async () => {
      const mockInstallation = {
        name: 'endpoint',
        version: '9.4.0',
        install_version: '9.4.0',
        install_status: 'installed',
        install_started_at: '2024-01-01T00:00:00.000Z',
        install_source: 'registry',
        verification_status: 'verified',
        installed_kibana: [],
        installed_es: [],
        package_assets: [],
        es_index_patterns: {},
      } as Awaited<ReturnType<typeof mockPackageClient.getInstallation>>;

      const transformConfig = {
        id: 'transform-id-1',
        source: {
          index: 'metrics-endpoint.metadata*',
          query: {
            bool: {
              filter: [
                { term: { 'agent.type': 'endpoint' } },
                { range: { '@timestamp': { gte: 'now-1d' } } },
              ],
            },
          },
        },
        dest: { index: 'metrics-endpoint.metadata_current' },
        frequency: '5m',
        sync: { time: { field: '@timestamp', delay: '60s' } },
        settings: {
          max_page_search_size: 500,
        },
      };

      const mockAssetsMap = new Map<string, Buffer>();
      mockAssetsMap.set(
        'endpoint-9.4.0/elasticsearch/transform/metadata_current/default.json',
        Buffer.from(JSON.stringify(transformConfig))
      );

      const mockPackageData = {
        assetsMap: mockAssetsMap,
        paths: ['elasticsearch/transform/metadata_current/default.json'],
        packageInfo: {
          name: 'endpoint',
          version: '9.4.0',
          title: 'Elastic Defend',
          description: 'Endpoint security package',
        },
      } as Awaited<ReturnType<typeof mockPackageClient.getPackage>>;

      (mockPackageClient.getInstallation as jest.Mock).mockResolvedValue(mockInstallation);
      (mockPackageClient.getPackage as jest.Mock).mockResolvedValue(mockPackageData);

      const mockTransformResponse: TransformGetTransformResponse = {
        count: 0,
        transforms: [],
      };

      const mockTransformStatsResponse: TransformGetTransformStatsResponse = {
        count: 0,
        transforms: [],
      };

      const mockIndexSettings: IndicesGetSettingsResponse = {};
      const mockIngestPipelines: IngestGetPipelineResponse = {};
      const mockNodeStats: CatNodesResponse = [];

      mockEsClient.asCurrentUser.transform.getTransform.mockResolvedValue(mockTransformResponse);
      mockEsClient.asCurrentUser.transform.getTransformStats.mockResolvedValue(
        mockTransformStatsResponse
      );
      mockEsClient.asCurrentUser.indices.getSettings.mockResolvedValue(mockIndexSettings);
      mockEsClient.asCurrentUser.ingest.getPipeline.mockResolvedValue(mockIngestPipelines);
      mockEsClient.asCurrentUser.cat.nodes.mockResolvedValue(mockNodeStats);
      const result = await tool.handler({}, {
        esClient: mockEsClient,
      } as unknown as ToolHandlerContext);

      if ('results' in result) {
        // @ts-expect-error
        expect(result.results[0].data.defaultTransformSettings).toHaveLength(1);
        // @ts-expect-error
        expect(result.results[0].data.defaultTransformSettings[0].config).toEqual(transformConfig);
      }
    });
  });
});
