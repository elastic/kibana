/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { AIAssistantConversationsDataClient } from '../ai_assistant_data_clients/conversations';
import { AIAssistantKnowledgeBaseDataClient } from '../ai_assistant_data_clients/knowledge_base';
import { AIAssistantDataClient } from '../ai_assistant_data_clients';
import { AttackDiscoveryDataClient } from '../lib/attack_discovery/persistence';

type ConversationsDataClientContract = PublicMethodsOf<AIAssistantConversationsDataClient>;
export type ConversationsDataClientMock = jest.Mocked<ConversationsDataClientContract>;
type AttackDiscoveryDataClientContract = PublicMethodsOf<AttackDiscoveryDataClient>;
export type AttackDiscoveryDataClientMock = jest.Mocked<AttackDiscoveryDataClientContract>;
type KnowledgeBaseDataClientContract = PublicMethodsOf<AIAssistantKnowledgeBaseDataClient>;
export type KnowledgeBaseDataClientMock = jest.Mocked<KnowledgeBaseDataClientContract>;

const createConversationsDataClientMock = () => {
  const mocked: ConversationsDataClientMock = {
    findDocuments: jest.fn(),
    appendConversationMessages: jest.fn(),
    createConversation: jest.fn(),
    deleteConversation: jest.fn(),
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

const createAttackDiscoveryDataClientMock = (): AttackDiscoveryDataClientMock => ({
  getAttackDiscovery: jest.fn(),
  createAttackDiscovery: jest.fn(),
  findAllAttackDiscoveries: jest.fn(),
  findAttackDiscoveryByConnectorId: jest.fn(),
  updateAttackDiscovery: jest.fn(),
  getReader: jest.fn(),
  getWriter: jest.fn().mockResolvedValue({ bulk: jest.fn() }),
  findDocuments: jest.fn(),
});

export const attackDiscoveryDataClientMock: {
  create: () => AttackDiscoveryDataClientMock;
} = {
  create: createAttackDiscoveryDataClientMock,
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
    getInferenceEndpointId: jest.fn(),
    isModelInstalled: jest.fn(),
    isSecurityLabsDocsLoaded: jest.fn(),
    isSetupAvailable: jest.fn(),
    isUserDataExists: jest.fn(),
    setupKnowledgeBase: jest.fn(),
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
