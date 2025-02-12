/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  coreMock,
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import { AIAssistantKnowledgeBaseDataClient, KnowledgeBaseDataClientParams } from '.';
import {
  getCreateKnowledgeBaseEntrySchemaMock,
  getKnowledgeBaseEntryMock,
  getKnowledgeBaseEntrySearchEsMock,
} from '../../__mocks__/knowledge_base_entry_schema.mock';
import { authenticatedUser } from '../../__mocks__/user';
import { IndexPatternsFetcher } from '@kbn/data-plugin/server';
import type { MlPluginSetup } from '@kbn/ml-plugin/server';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import pRetry from 'p-retry';

import {
  loadSecurityLabs,
  getSecurityLabsDocsCount,
} from '../../lib/langchain/content_loaders/security_labs_loader';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { newContentReferencesStoreMock } from '@kbn/elastic-assistant-common/impl/content_references/content_references_store/__mocks__/content_references_store.mock';
jest.mock('../../lib/langchain/content_loaders/security_labs_loader');
jest.mock('p-retry');
const date = '2023-03-28T22:27:28.159Z';
let logger: ReturnType<(typeof loggingSystemMock)['createLogger']>;
const esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;

const mockUser1 = authenticatedUser;

const mockedPRetry = pRetry as jest.MockedFunction<typeof pRetry>;
mockedPRetry.mockResolvedValue({});
const telemetry = coreMock.createSetup().analytics;

describe('AIAssistantKnowledgeBaseDataClient', () => {
  let mockOptions: KnowledgeBaseDataClientParams;
  let ml: MlPluginSetup;
  let savedObjectClient: ReturnType<typeof savedObjectsRepositoryMock.create>;
  const getElserId = jest.fn();
  const trainedModelsProvider = jest.fn();
  const installElasticModel = jest.fn();
  const mockLoadSecurityLabs = loadSecurityLabs as jest.Mock;
  const mockGetSecurityLabsDocsCount = getSecurityLabsDocsCount as jest.Mock;
  const mockGetIsKBSetupInProgress = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    savedObjectClient = savedObjectsRepositoryMock.create();
    mockLoadSecurityLabs.mockClear();
    ml = mlPluginMock.createSetupContract() as unknown as MlPluginSetup; // Missing SharedServices mock, so manually mocking trainedModelsProvider
    ml.trainedModelsProvider = trainedModelsProvider.mockImplementation(() => ({
      getELSER: jest.fn().mockImplementation(() => '.elser_model_2'),
      installElasticModel: installElasticModel.mockResolvedValue({}),
    }));
    mockOptions = {
      logger,
      elasticsearchClientPromise: Promise.resolve(esClientMock),
      spaceId: 'default',
      indexPatternsResourceName: '',
      currentUser: mockUser1,
      kibanaVersion: '8.8.0',
      ml,
      getElserId: getElserId.mockResolvedValue('elser-id'),
      getIsKBSetupInProgress: mockGetIsKBSetupInProgress.mockReturnValue(false),
      ingestPipelineResourceName: 'something',
      setIsKBSetupInProgress: jest.fn().mockImplementation(() => {}),
      manageGlobalKnowledgeBaseAIAssistant: true,
      assistantDefaultInferenceEndpoint: false,
    };
    esClientMock.search.mockReturnValue(
      // @ts-expect-error not full response interface
      getKnowledgeBaseEntrySearchEsMock()
    );
  });

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(date));
  });

  afterAll(() => {
    jest.useRealTimers();
  });
  describe('isSetupInProgress', () => {
    it('should return true if setup is in progress', () => {
      mockGetIsKBSetupInProgress.mockReturnValueOnce(true);
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      const result = client.isSetupInProgress;

      expect(result).toBe(true);
    });

    it('should return false if setup is not in progress', () => {
      mockGetIsKBSetupInProgress.mockReturnValueOnce(false);
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      const result = client.isSetupInProgress;

      expect(result).toBe(false);
    });
  });
  describe('isSetupAvailable', () => {
    it('should return true if ML capabilities check succeeds', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      // @ts-expect-error not full response interface
      esClientMock.ml.getMemoryStats.mockResolvedValue({});
      const result = await client.isSetupAvailable();
      expect(result).toBe(true);
      expect(esClientMock.ml.getMemoryStats).toHaveBeenCalled();
    });

    it('should return false if ML capabilities check fails', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getMemoryStats.mockRejectedValue(new Error('Mocked Error'));
      const result = await client.isSetupAvailable();
      expect(result).toBe(false);
    });
  });

  describe('isModelInstalled', () => {
    it('should check if ELSER model is installed and return true if fully_defined', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 1,
        trained_model_configs: [
          { fully_defined: true, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      const result = await client.isModelInstalled();
      expect(result).toBe(true);
      expect(esClientMock.ml.getTrainedModels).toHaveBeenCalledWith({
        model_id: 'elser-id',
        include: 'definition_status',
      });
    });

    it('should return false if model is not fully defined', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 0,
        trained_model_configs: [
          { fully_defined: false, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      const result = await client.isModelInstalled();
      expect(result).toBe(false);
    });

    it('should return false and log error if getting model details fails', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModels.mockRejectedValue(new Error('error happened'));
      const result = await client.isModelInstalled();
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('isInferenceEndpointExists', () => {
    it('returns true when the model is fully allocated and started in ESS', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValueOnce({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              // @ts-expect-error not full response interface
              allocation_status: { state: 'fully_allocated' },
            },
          },
        ],
      });

      const result = await client.isInferenceEndpointExists();

      expect(result).toBe(true);
    });

    it('returns true when the model is started in serverless', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValueOnce({
        trained_model_stats: [
          {
            deployment_stats: {
              // @ts-expect-error not full response interface
              nodes: [{ routing_state: { routing_state: 'started' } }],
            },
          },
        ],
      });

      const result = await client.isInferenceEndpointExists();

      expect(result).toBe(true);
    });

    it('returns false when the model is not fully allocated in ESS', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValueOnce({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              // @ts-expect-error not full response interface
              allocation_status: { state: 'partially_allocated' },
            },
          },
        ],
      });

      const result = await client.isInferenceEndpointExists();

      expect(result).toBe(false);
    });

    it('returns false when the model is not started in serverless', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockResolvedValueOnce({
        trained_model_stats: [
          {
            deployment_stats: {
              // @ts-expect-error not full response interface
              nodes: [{ routing_state: { routing_state: 'stopped' } }],
            },
          },
        ],
      });

      const result = await client.isInferenceEndpointExists();

      expect(result).toBe(false);
    });

    it('returns false when an error occurs during the check', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.ml.getTrainedModelsStats.mockRejectedValueOnce(new Error('Mocked Error'));

      const result = await client.isInferenceEndpointExists();

      expect(result).toBe(false);
    });

    it('should return false if inference api returns undefined', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      // @ts-ignore
      esClientMock.inference.get.mockResolvedValueOnce(undefined);
      const result = await client.isInferenceEndpointExists();
      expect(result).toBe(false);
    });

    it('should return false when inference check throws an error', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      esClientMock.inference.get.mockRejectedValueOnce(new Error('Mocked Error'));
      const result = await client.isInferenceEndpointExists();
      expect(result).toBe(false);
    });
  });

  describe('setupKnowledgeBase', () => {
    it('should install, deploy, and load docs if not already done', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});

      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      await client.setupKnowledgeBase({ soClient: savedObjectClient });

      // install model
      expect(trainedModelsProvider).toHaveBeenCalledWith({}, savedObjectClient);
      expect(installElasticModel).toHaveBeenCalledWith('elser-id');

      expect(loadSecurityLabs).toHaveBeenCalled();
    });

    it('should skip installation and deployment if model is already installed and deployed', async () => {
      mockGetSecurityLabsDocsCount.mockResolvedValue(1);
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 1,
        trained_model_configs: [
          { fully_defined: true, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      esClientMock.ml.getTrainedModelsStats.mockResolvedValue({
        trained_model_stats: [
          {
            deployment_stats: {
              state: 'started',
              // @ts-expect-error not full response interface
              allocation_status: {
                state: 'fully_allocated',
              },
            },
          },
        ],
      });
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      await client.setupKnowledgeBase({ soClient: savedObjectClient });

      expect(installElasticModel).not.toHaveBeenCalled();
      expect(esClientMock.ml.startTrainedModelDeployment).not.toHaveBeenCalled();
      expect(loadSecurityLabs).not.toHaveBeenCalled();
    });

    it('should handle errors during installation and deployment', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});
      esClientMock.ml.getTrainedModels.mockResolvedValue({
        count: 0,
        trained_model_configs: [
          { fully_defined: false, model_id: '', tags: [], input: { field_names: ['content'] } },
        ],
      });
      mockLoadSecurityLabs.mockRejectedValue(new Error('Installation error'));
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      await expect(client.setupKnowledgeBase({ soClient: savedObjectClient })).rejects.toThrow(
        'Error setting up Knowledge Base: Installation error'
      );
      expect(mockOptions.logger.error).toHaveBeenCalledWith(
        'Error setting up Knowledge Base: Installation error'
      );
    });
  });

  describe('addKnowledgeBaseDocuments', () => {
    const documents = [
      {
        pageContent: 'Document 1',
        metadata: { kbResource: 'user', source: 'user', required: false },
      },
    ];
    it('should add documents to the knowledge base', async () => {
      esClientMock.bulk.mockResolvedValue({
        items: [
          {
            create: {
              status: 200,
              _id: '123',
              _index: 'index',
            },
          },
        ],
        took: 9999,
        errors: false,
      });
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const result = await client.addKnowledgeBaseDocuments({ documents });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(getKnowledgeBaseEntryMock());
    });

    it('should swallow errors during bulk write', async () => {
      esClientMock.bulk.mockRejectedValueOnce(new Error('Bulk write error'));
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const result = await client.addKnowledgeBaseDocuments({ documents });
      expect(result).toEqual([]);
    });
  });

  describe('isSecurityLabsDocsLoaded', () => {
    it('should resolve to true when docs exist', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const results = await client.isSecurityLabsDocsLoaded();

      expect(results).toEqual(true);
    });
    it('should resolve to false when docs do not exist', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValueOnce({ hits: { hits: [] } });
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const results = await client.isSecurityLabsDocsLoaded();

      expect(results).toEqual(false);
    });
    it('should resolve to false when docs error', async () => {
      esClientMock.search.mockRejectedValueOnce(new Error('Search error'));
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const results = await client.isSecurityLabsDocsLoaded();

      expect(results).toEqual(false);
    });
  });

  describe('getKnowledgeBaseDocumentEntries', () => {
    it('should fetch documents based on query and filters', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const results = await client.getKnowledgeBaseDocumentEntries({
        query: 'test query',
        kbResource: 'security_labs',
      });

      expect(results).toHaveLength(1);
      expect(results[0].pageContent).toBe('test');
      expect(results[0].metadata.kbResource).toBe('test');
    });

    it('should swallow errors during search', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      esClientMock.search.mockRejectedValueOnce(new Error('Search error'));

      const results = await client.getKnowledgeBaseDocumentEntries({
        query: 'test query',
      });
      expect(results).toEqual([]);
    });

    it('should return an empty array if no documents are found', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValueOnce({ hits: { hits: [] } });

      const results = await client.getKnowledgeBaseDocumentEntries({
        query: 'test query',
      });

      expect(results).toEqual([]);
    });
  });

  describe('getRequiredKnowledgeBaseDocumentEntries', () => {
    it('should throw is user is not found', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient({
        ...mockOptions,
        currentUser: null,
      });
      await expect(
        assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries()
      ).rejects.toThrowError(
        'Authenticated user not found! Ensure kbDataClient was initialized from a request.'
      );
    });
    it('should fetch the required knowledge base entry successfully', async () => {
      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(esClientMock.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([
        getKnowledgeBaseEntryMock(getCreateKnowledgeBaseEntrySchemaMock({ required: true })),
      ]);
    });
    it('should return empty array if unexpected response from findDocuments', async () => {
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValue({});

      const assistantKnowledgeBaseDataClient = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      const result =
        await assistantKnowledgeBaseDataClient.getRequiredKnowledgeBaseDocumentEntries();

      expect(esClientMock.search).toHaveBeenCalledTimes(1);

      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('createKnowledgeBaseEntry', () => {
    const knowledgeBaseEntry = getCreateKnowledgeBaseEntrySchemaMock();
    it('should create a new Knowledge Base entry', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const result = await client.createKnowledgeBaseEntry({ telemetry, knowledgeBaseEntry });
      expect(result).toEqual(getKnowledgeBaseEntryMock());
    });

    it('should throw error if user is not authenticated', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = null;

      await expect(
        client.createKnowledgeBaseEntry({ telemetry, knowledgeBaseEntry })
      ).rejects.toThrow('Authenticated user not found!');
    });

    it('should throw error if user lacks privileges to create global entries', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;
      mockOptions.manageGlobalKnowledgeBaseAIAssistant = false;

      await expect(
        client.createKnowledgeBaseEntry({ telemetry, knowledgeBaseEntry, global: true })
      ).rejects.toThrow('User lacks privileges to create global knowledge base entries');
    });
  });

  describe('getAssistantTools', () => {
    it('should return structured tools for relevant index entries', async () => {
      IndexPatternsFetcher.prototype.getExistingIndices = jest.fn().mockResolvedValue(['test']);
      esClientMock.search.mockReturnValue(
        // @ts-expect-error not full response interface
        getKnowledgeBaseEntrySearchEsMock('index')
      );
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;

      const result = await client.getAssistantTools({
        esClient: esClientMock,
        contentReferencesStore: newContentReferencesStoreMock(),
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(DynamicStructuredTool);
    });

    it('should return an empty array if no relevant index entries are found', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;
      // @ts-expect-error not full response interface
      esClientMock.search.mockResolvedValueOnce({ hits: { hits: [] } });

      const result = await client.getAssistantTools({
        esClient: esClientMock,
        contentReferencesStore: newContentReferencesStoreMock(),
      });

      expect(result).toEqual([]);
    });

    it('should swallow errors during fetching index entries', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);
      mockOptions.currentUser = mockUser1;
      esClientMock.search.mockRejectedValueOnce(new Error('Error fetching index entries'));

      const result = await client.getAssistantTools({
        esClient: esClientMock,
        contentReferencesStore: newContentReferencesStoreMock(),
      });

      expect(result).toEqual([]);
    });
  });

  describe('createInferenceEndpoint', () => {
    it('should create a new Knowledge Base entry', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      esClientMock.inference.put.mockResolvedValueOnce({
        inference_id: 'id',
        task_type: 'completion',
        service: 'string',
        service_settings: {},
        task_settings: {},
      });

      await client.createInferenceEndpoint();

      await expect(client.createInferenceEndpoint()).resolves.not.toThrow();
      expect(esClientMock.inference.put).toHaveBeenCalled();
    });

    it('should throw error if user is not authenticated', async () => {
      const client = new AIAssistantKnowledgeBaseDataClient(mockOptions);

      esClientMock.inference.put.mockRejectedValueOnce(new Error('Inference error'));

      await expect(client.createInferenceEndpoint()).rejects.toThrow('Inference error');
      expect(esClientMock.inference.put).toHaveBeenCalled();
    });
  });
});
