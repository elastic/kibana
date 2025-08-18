/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  createPlatformPipeline,
  deletePlatformPipeline,
  getPlatformPipelineStatus,
  ENRICH_FIELD,
} from './ingest_pipeline';
import type { EntityEngineInstallationDescriptor } from '../installation/types';
import { EngineComponentResourceEnum } from '../../../../../common/api/entity_analytics';

describe('ingest_pipeline', () => {
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockEsClient = {
      ingest: {
        putPipeline: jest.fn(),
        deletePipeline: jest.fn(),
        getPipeline: jest.fn(),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  describe('createPlatformPipeline', () => {
    const baseDescription: EntityEngineInstallationDescriptor = {
      id: 'test-entity-engine',
      entityType: 'generic',
      identityField: 'entity.id',
      version: '1.0.0',
      indexPatterns: [],
      indexMappings: {},
      settings: {
        syncDelay: '1m',
        frequency: '1m',
        timeout: '1m',
        lookbackPeriod: '1d',
        timestampField: '@timestamp',
      },
      fields: [
        {
          source: 'source.field',
          destination: 'destination.field',
          mapping: { type: 'keyword' },
          aggregation: {
            type: 'top_value',
            sort: { '@timestamp': 'desc' },
          },
          retention: { operation: 'prefer_newest_value' },
        },
      ],
      dynamic: false,
      identityFieldMapping: {},
    };
    const options = { namespace: 'default' };

    it('should create a platform pipeline with basic configuration', async () => {
      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: baseDescription,
        options,
      });

      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      const pipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock.calls[0][0];
      expect(pipelineCall.id).toBe('test-entity-engine-latest@platform');
      expect(pipelineCall.description).toBe(
        'Ingest pipeline for entity definition test-entity-engine'
      );
      expect(pipelineCall._meta?.managed_by).toBe('entity_store');
      // Using the exact array from the "Received" in the previous error log
      expect(pipelineCall.processors).toMatchSnapshot();
    });

    it('should include debug steps if debugMode is true', async () => {
      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: baseDescription,
        options,
        debugMode: true,
      });

      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      const pipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock.calls[0][0];
      // Based on "Received" output, debug_ctx script is first, then other debug sets
      expect(pipelineCall.processors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            // debug_ctx deep copy script
            script: expect.objectContaining({
              lang: 'painless',
              source: expect.stringContaining('ctx.debug_ctx = deepCopy(ctx);'),
            }),
          }),
          {
            // debug.collected set
            set: {
              field: 'debug.collected',
              value: '{{collected.metadata}}',
            },
          },
          {
            // debug._source set
            set: {
              field: 'debug._source',
              value: '{{_source}}',
            },
          },
        ])
      );
      // Ensure enrich field is not removed in debug mode
      expect(pipelineCall.processors).not.toEqual(
        expect.arrayContaining([{ remove: { ignore_failure: true, field: ENRICH_FIELD } }])
      );
    });

    it('should have more processors if dynamic is true (indicating dynamicNewestRetentionSteps)', async () => {
      // Get length of processors for non-dynamic
      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: baseDescription, // dynamic: false
        options,
      });
      const nonDynamicPipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock
        .calls[0][0];
      const nonDynamicProcessorCount = nonDynamicPipelineCall.processors.length;

      // Reset mock for the next call
      (mockEsClient.ingest.putPipeline as jest.Mock).mockClear();

      const descriptionDynamic: EntityEngineInstallationDescriptor = {
        ...baseDescription,
        dynamic: true,
      };

      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: descriptionDynamic,
        options,
      });

      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      const dynamicPipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock.calls[0][0];
      // Expect at least one more processor when dynamic is true
      expect(dynamicPipelineCall.processors.length).toBeGreaterThan(nonDynamicProcessorCount);
    });

    it('should use custom pipeline function if provided', async () => {
      const customPipelineFn = jest.fn((processors) => [
        { set: { field: 'custom.pipeline', value: true } },
        ...processors,
      ]);
      const descriptionWithCustomPipeline: EntityEngineInstallationDescriptor = {
        ...baseDescription,
        pipeline: customPipelineFn,
      };

      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: descriptionWithCustomPipeline,
        options,
      });

      expect(customPipelineFn).toHaveBeenCalledTimes(1);
      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      const pipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock.calls[0][0];
      expect(pipelineCall.processors).toEqual(
        expect.arrayContaining([{ set: { field: 'custom.pipeline', value: true } }])
      );
    });

    it('should use custom pipeline array if provided', async () => {
      const customProcessor = { set: { field: 'custom.field', value: 'custom_value' } };
      const descriptionWithCustom: EntityEngineInstallationDescriptor = {
        ...baseDescription,
        pipeline: [customProcessor],
      };

      await createPlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description: descriptionWithCustom,
        options,
      });

      expect(mockEsClient.ingest.putPipeline).toHaveBeenCalledTimes(1);
      const pipelineCall = (mockEsClient.ingest.putPipeline as jest.Mock).mock.calls[0][0];
      expect(pipelineCall.processors).toEqual(expect.arrayContaining([customProcessor]));
    });
  });

  describe('deletePlatformPipeline', () => {
    const description: EntityEngineInstallationDescriptor = {
      id: 'test-delete-engine',
      entityType: 'generic',
      identityField: 'entity.id',
      version: '1.0.0',
      indexPatterns: [],
      indexMappings: {},
      settings: {
        syncDelay: '1m',
        frequency: '1m',
        timeout: '1m',
        lookbackPeriod: '1d',
        timestampField: '@timestamp',
      },
      fields: [],
      dynamic: false,
      identityFieldMapping: {},
    };

    it('should call deletePipeline with the correct ID', async () => {
      await deletePlatformPipeline({
        logger: mockLogger,
        esClient: mockEsClient,
        description,
      });

      expect(mockEsClient.ingest.deletePipeline).toHaveBeenCalledTimes(1);
      expect(mockEsClient.ingest.deletePipeline).toHaveBeenCalledWith(
        { id: 'test-delete-engine-latest@platform' },
        { ignore: [404] }
      );
    });
  });

  describe('getPlatformPipelineStatus', () => {
    const engineId = 'test-status-engine';

    it('should return installed: true if pipeline exists', async () => {
      (mockEsClient.ingest.getPipeline as jest.Mock).mockResolvedValueOnce({
        'test-status-engine-latest@platform': { processors: [] },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const status = await getPlatformPipelineStatus({
        engineId,
        esClient: mockEsClient,
      });

      expect(mockEsClient.ingest.getPipeline).toHaveBeenCalledTimes(1);
      expect(mockEsClient.ingest.getPipeline).toHaveBeenCalledWith(
        { id: 'test-status-engine-latest@platform' },
        { ignore: [404] }
      );
      expect(status).toEqual({
        id: 'test-status-engine-latest@platform',
        installed: true,
        resource: EngineComponentResourceEnum.ingest_pipeline,
      });
    });

    it('should return installed: false if pipeline does not exist (404)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockEsClient.ingest.getPipeline as jest.Mock).mockResolvedValueOnce({} as any);

      const status = await getPlatformPipelineStatus({
        engineId,
        esClient: mockEsClient,
      });

      expect(mockEsClient.ingest.getPipeline).toHaveBeenCalledTimes(1);
      expect(mockEsClient.ingest.getPipeline).toHaveBeenCalledWith(
        { id: 'test-status-engine-latest@platform' },
        { ignore: [404] }
      );
      expect(status).toEqual({
        id: 'test-status-engine-latest@platform',
        installed: false,
        resource: EngineComponentResourceEnum.ingest_pipeline,
      });
    });
  });
});
