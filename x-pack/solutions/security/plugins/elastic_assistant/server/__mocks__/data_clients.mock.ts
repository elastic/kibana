/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import type { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import type { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import type { AIAssistantDataClient } from '../ai_assistant_data_clients';
import type { AttackDiscoveryDataClient } from '../lib/attack_discovery/persistence';
import type { AttackDiscoveryScheduleDataClient } from '../lib/attack_discovery/schedules/data_client';

type ConversationsDataClientContract = PublicMethodsOf<AIAssistantConversationsDataClient>;
export type ConversationsDataClientMock = jest.Mocked<ConversationsDataClientContract>;
type AttackDiscoveryDataClientContract = PublicMethodsOf<AttackDiscoveryDataClient> & {
  spaceId: AttackDiscoveryDataClient['spaceId'];
  indexTemplateAndPattern: AttackDiscoveryDataClient['indexTemplateAndPattern'];
  options: AttackDiscoveryDataClient['options'];
  // additional properties that are accessed at runtime:
  adhocAttackDiscoveryDataClient: unknown;
  currentUser: unknown;
  writerCache: unknown;
  initializeWriter: unknown;
};
export type AttackDiscoveryDataClientMock = jest.Mocked<AttackDiscoveryDataClientContract>;
type AttackDiscoveryScheduleDataClientContract = PublicMethodsOf<AttackDiscoveryScheduleDataClient>;
export type AttackDiscoveryScheduleDataClientMock =
  jest.Mocked<AttackDiscoveryScheduleDataClientContract>;
type KnowledgeBaseDataClientContract = PublicMethodsOf<AIAssistantKnowledgeBaseDataClient> & {
  isSetupInProgress: AIAssistantKnowledgeBaseDataClient['isSetupInProgress'];
};
export type KnowledgeBaseDataClientMock = jest.Mocked<KnowledgeBaseDataClientContract>;

const createConversationsDataClientMock = () => {
  const mocked: ConversationsDataClientMock = {
    findDocuments: jest.fn(),
    appendConversationMessages: jest.fn(),
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
    deleteAllConversations: jest.fn(),
    conversationExists: jest.fn(),
    getConversation: jest.fn(),
    updateConversation: jest.fn(),
    getReader: jest.fn(),
    getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
  };
  return mocked;
};

export const conversationsDataClientMock: {
  create: () => ConversationsDataClientMock;
} = {
  create: createConversationsDataClientMock,
};

const createAttackDiscoveryDataClientMock = (): AttackDiscoveryDataClientMock => {
  const mockDataClient: AttackDiscoveryDataClientMock = {
    bulkUpdateAttackDiscoveryAlerts: jest.fn(),
    getAdHocAlertsIndexPattern: jest.fn(),
    getScheduledAndAdHocIndexPattern: jest.fn(),
    createAttackDiscoveryAlerts: jest.fn(),
    findAttackDiscoveryAlerts: jest.fn(),
    findDocuments: jest.fn(),
    getAttackDiscoveryGenerations: jest.fn(),
    getAttackDiscoveryGenerationById: jest.fn(),
    getReader: jest.fn(),
    getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
    refreshEventLogIndex: jest.fn(),
    // Properties from AIAssistantDataClient
    spaceId: 'default',
    indexTemplateAndPattern: {
      alias: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default',
      pattern: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default*',
      basePattern: '.kibana-elastic-ai-assistant-attack-discovery',
      name: '.ds-.kibana-elastic-ai-assistant-attack-discovery-default-000001',
      validPrefixes: ['.ds-.kibana-elastic-ai-assistant-attack-discovery-default'],
    },
    options: {
      elasticsearchClientPromise: Promise.resolve(
        elasticsearchServiceMock.createElasticsearchClient()
      ),
      kibanaVersion: '8.0.0',
      spaceId: 'default',
      logger: loggingSystemMock.createLogger(),
      indexPatternsResourceName: 'attackDiscovery',
      currentUser: null,
      adhocAttackDiscoveryDataClient: undefined,
    },
    // Additional properties that are accessed at runtime
    adhocAttackDiscoveryDataClient: undefined,
    currentUser: null,
    writerCache: new Map(),
    initializeWriter: jest.fn(),
  };

  return mockDataClient;
};

export const attackDiscoveryDataClientMock: {
  create: () => AttackDiscoveryDataClientMock;
} = {
  create: createAttackDiscoveryDataClientMock,
};

const createAttackDiscoveryScheduleDataClientMock = (): AttackDiscoveryScheduleDataClientMock => ({
  findSchedules: jest.fn(),
  getSchedule: jest.fn(),
  createSchedule: jest.fn(),
  updateSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  enableSchedule: jest.fn(),
  disableSchedule: jest.fn(),
});

export const attackDiscoveryScheduleDataClientMock: {
  create: () => AttackDiscoveryScheduleDataClientMock;
} = {
  create: createAttackDiscoveryScheduleDataClientMock,
};

const createKnowledgeBaseDataClientMock = () => {
  const mocked: KnowledgeBaseDataClientMock = {
    addKnowledgeBaseDocuments: jest.fn(),
    createInferenceEndpoint: jest.fn(),
    createKnowledgeBaseEntry: jest.fn(),
    updateKnowledgeBaseEntry: jest.fn(),
    deleteKnowledgeBaseEntry: jest.fn(),
    findDocuments: jest.fn(),
    getAssistantTools: jest.fn(),
    getKnowledgeBaseDocumentEntries: jest.fn(),
    getReader: jest.fn(),
    getRequiredKnowledgeBaseDocumentEntries: jest.fn(),
    getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
    isInferenceEndpointExists: jest.fn(),
    isModelInstalled: jest.fn(),
    isSecurityLabsDocsLoaded: jest.fn(),
    isDefendInsightsDocsLoaded: jest.fn(),
    isSetupAvailable: jest.fn(),
    isSetupInProgress: jest.fn().mockReturnValue(false)(),
    isUserDataExists: jest.fn(),
    setupKnowledgeBase: jest.fn(),
    getLoadedSecurityLabsDocsCount: jest.fn(),
    getLoadedDefendInsightsDocsCount: jest.fn(),
    getProductDocumentationStatus: jest.fn(),
  };

  return mocked;
};

export const knowledgeBaseDataClientMock: {
  create: () => KnowledgeBaseDataClientMock;
} = {
  create: createKnowledgeBaseDataClientMock,
};

type AIAssistantDataClientContract = PublicMethodsOf<AIAssistantDataClient>;
export type AIAssistantDataClientMock = jest.Mocked<AIAssistantDataClientContract>;

const createAIAssistantDataClientMock = () => {
  const mocked: AIAssistantDataClientMock = {
    findDocuments: jest.fn(),
    getReader: jest.fn(),
    getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
  };
  return mocked;
};

export const dataClientMock: {
  create: () => AIAssistantDataClientMock;
} = {
  create: createAIAssistantDataClientMock,
};
