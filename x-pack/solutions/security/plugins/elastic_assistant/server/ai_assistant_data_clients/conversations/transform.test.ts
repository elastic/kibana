/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import {
  ELASTIC_MANAGED_LLM_CONNECTOR_ID,
  LATEST_ELASTIC_MANAGED_CONNECTOR_ID,
} from '@kbn/elastic-assistant-common';

import {
  transformESToConversation,
  transformESSearchToConversations,
  transformESToConversations,
  transformFieldNamesToSourceScheme,
} from './transforms';
import type { EsConversationSchema } from './types';

const userAsUser = {
  id: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
  name: 'elastic',
};

const getEsConversationMock = (): EsConversationSchema => {
  return {
    '@timestamp': '2025-08-19T10:49:52.884Z',
    updated_at: '2025-08-19T13:26:01.746Z',
    api_config: {
      action_type_id: '.gen-ai',
      connector_id: 'gpt-4-1',
    },
    namespace: 'default',
    created_at: '2025-08-19T10:49:52.884Z',
    created_by: userAsUser,
    messages: [
      {
        '@timestamp': '2025-08-19T10:49:53.799Z',
        role: 'user',
        content: 'Hello there, how many opened alerts do I have?',
      },
      {
        metadata: {
          content_references: {
            oQ5xL: {
              id: 'oQ5xL',
              type: 'SecurityAlertsPage',
            },
          },
          interrupt_value: {
            type: 'INPUT_TEXT',
            threadId: 'thread-1',
            description: 'Ask user for text input',
          },
          interrupt_resume_value: {
            type: 'INPUT_TEXT',
            value: 'User provided string',
          },
        },
        '@timestamp': '2025-08-19T10:49:57.398Z',
        role: 'assistant',
        is_error: false,
        trace_data: {
          transaction_id: 'ee432e8be6ad3f9c',
          trace_id: 'f44d01b6095d35dce15aa8137df76e29',
        },
        content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
      },
    ],
    replacements: [],
    title: 'Viewing the Number of Open Alerts in Elastic Security',
    category: 'assistant',
    users: [userAsUser],
    id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
  };
};

const getEsSearchConversationsMock = (): estypes.SearchResponse<EsConversationSchema> => {
  return {
    took: 0,
    timed_out: false,
    _shards: {
      total: 1,
      successful: 1,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: {
        value: 1,
        relation: 'eq',
      },
      max_score: null,
      hits: [
        {
          _index: '.ds-.kibana-elastic-ai-assistant-conversations-default-2025.08.19-000001',
          _id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
          _seq_no: 8,
          _primary_term: 1,
          _score: null,
          _source: {
            ...getEsConversationMock(),
          },
          sort: [1755607491083],
        },
      ],
    },
  };
};

describe('transforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('transformESToConversation', () => {
    it('should correctly transform ES conversation with mapped connector ID', () => {
      const esConversation = getEsConversationMock();

      const message = transformESToConversation({
        ...esConversation,
        api_config: {
          ...esConversation.api_config,
          connector_id: ELASTIC_MANAGED_LLM_CONNECTOR_ID,
        } as EsConversationSchema['api_config'],
      });
      expect(message.apiConfig?.connectorId).toBe(LATEST_ELASTIC_MANAGED_CONNECTOR_ID);
    });

    it('should correctly transform ES conversation with unmapped connector ID', () => {
      const esConversation = getEsConversationMock();

      const message = transformESToConversation({
        ...esConversation,
        api_config: {
          ...esConversation.api_config,
          connector_id: 'some-other-id',
        } as EsConversationSchema['api_config'],
      });
      expect(message.apiConfig?.connectorId).toBe('some-other-id');
    });

    it('should correctly transform ES conversation', () => {
      const esConversation = getEsConversationMock();
      const conversation = transformESToConversation(esConversation);
      expect(conversation).toEqual({
        timestamp: '2025-08-19T10:49:52.884Z',
        createdAt: '2025-08-19T10:49:52.884Z',
        createdBy: userAsUser,
        users: [userAsUser],
        title: 'Viewing the Number of Open Alerts in Elastic Security',
        category: 'assistant',
        apiConfig: { actionTypeId: '.gen-ai', connectorId: 'gpt-4-1' },
        messages: [
          {
            timestamp: '2025-08-19T10:49:53.799Z',
            content: 'Hello there, how many opened alerts do I have?',
            role: 'user',
          },
          {
            timestamp: '2025-08-19T10:49:57.398Z',
            content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
            role: 'assistant',
            metadata: {
              contentReferences: { oQ5xL: { id: 'oQ5xL', type: 'SecurityAlertsPage' } },
              interruptValue: {
                type: 'INPUT_TEXT',
                threadId: 'thread-1',
                description: 'Ask user for text input',
              },
              interruptResumeValue: { type: 'INPUT_TEXT', value: 'User provided string' },
            },
            traceData: {
              traceId: 'f44d01b6095d35dce15aa8137df76e29',
              transactionId: 'ee432e8be6ad3f9c',
            },
          },
        ],
        updatedAt: '2025-08-19T13:26:01.746Z',
        replacements: {},
        namespace: 'default',
        id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
      });
    });
  });

  describe('transformESSearchToConversations', () => {
    it('should correctly transform conversation hits', () => {
      const conversationHits = getEsSearchConversationsMock();
      const conversations = transformESSearchToConversations(conversationHits);
      expect(conversations).toEqual([
        {
          timestamp: '2025-08-19T10:49:52.884Z',
          createdAt: '2025-08-19T10:49:52.884Z',
          createdBy: userAsUser,
          users: [userAsUser],
          title: 'Viewing the Number of Open Alerts in Elastic Security',
          category: 'assistant',
          apiConfig: { actionTypeId: '.gen-ai', connectorId: 'gpt-4-1' },
          messages: [
            {
              timestamp: '2025-08-19T10:49:53.799Z',
              content: 'Hello there, how many opened alerts do I have?',
              role: 'user',
            },
            {
              timestamp: '2025-08-19T10:49:57.398Z',
              content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
              role: 'assistant',
              metadata: {
                contentReferences: { oQ5xL: { id: 'oQ5xL', type: 'SecurityAlertsPage' } },
                interruptValue: {
                  type: 'INPUT_TEXT',
                  threadId: 'thread-1',
                  description: 'Ask user for text input',
                },
                interruptResumeValue: { type: 'INPUT_TEXT', value: 'User provided string' },
              },
              traceData: {
                traceId: 'f44d01b6095d35dce15aa8137df76e29',
                transactionId: 'ee432e8be6ad3f9c',
              },
            },
          ],
          updatedAt: '2025-08-19T13:26:01.746Z',
          replacements: {},
          namespace: 'default',
          id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
        },
      ]);
    });
  });

  describe('transformESToConversations', () => {
    it('should correctly transform ES conversations', () => {
      const esConversations = [getEsConversationMock()];
      const conversations = transformESToConversations(esConversations);
      expect(conversations).toEqual([
        {
          timestamp: '2025-08-19T10:49:52.884Z',
          createdAt: '2025-08-19T10:49:52.884Z',
          createdBy: userAsUser,
          users: [userAsUser],
          title: 'Viewing the Number of Open Alerts in Elastic Security',
          category: 'assistant',
          apiConfig: { actionTypeId: '.gen-ai', connectorId: 'gpt-4-1' },
          messages: [
            {
              timestamp: '2025-08-19T10:49:53.799Z',
              content: 'Hello there, how many opened alerts do I have?',
              role: 'user',
            },
            {
              timestamp: '2025-08-19T10:49:57.398Z',
              content: 'You currently have 61 open alerts in your environment. {reference(oQ5xL)}',
              role: 'assistant',
              metadata: {
                contentReferences: { oQ5xL: { id: 'oQ5xL', type: 'SecurityAlertsPage' } },
                interruptValue: {
                  type: 'INPUT_TEXT',
                  threadId: 'thread-1',
                  description: 'Ask user for text input',
                },
                interruptResumeValue: { type: 'INPUT_TEXT', value: 'User provided string' },
              },
              traceData: {
                traceId: 'f44d01b6095d35dce15aa8137df76e29',
                transactionId: 'ee432e8be6ad3f9c',
              },
            },
          ],
          updatedAt: '2025-08-19T13:26:01.746Z',
          replacements: {},
          namespace: 'default',
          id: 'a565baa8-5566-47b2-ab69-807248b2fc46',
        },
      ]);
    });
  });

  describe('transformFieldNamesToSourceScheme', () => {
    it('should correctly transform empty array', () => {
      const sourceNames = transformFieldNamesToSourceScheme([]);
      expect(sourceNames).toEqual([]);
    });

    it('should correctly transform field names', () => {
      const fields = [
        'timestamp',
        'apiConfig',
        'apiConfig.actionTypeId',
        'apiConfig.connectorId',
        'apiConfig.defaultSystemPromptId',
        'apiConfig.model',
        'apiConfig.provider',
      ];
      const sourceNames = transformFieldNamesToSourceScheme(fields);
      expect(sourceNames).toEqual([
        '@timestamp',
        'api_config',
        'api_config.action_type_id',
        'api_config.connector_id',
        'api_config.default_system_prompt_id',
        'api_config.model',
        'api_config.provider',
      ]);
    });
  });
});
