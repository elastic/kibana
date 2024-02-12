/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { BedrockSimulator } from '@kbn/actions-simulators-plugin/server/bedrock_simulation';
import { OpenAISimulator } from '@kbn/actions-simulators-plugin/server/openai_simulation';
import { createConnector, CreateConnectorBody } from '../../../../../common/utils/connectors';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { postActionsClientExecute } from '../utils/post_actions_client_execute';
import { ObjectRemover } from '../utils/object_remover';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const configService = getService('config');

  // @skipInQA tag because the simulators do not work in the QA env
  describe('@ess @serverless @skipInQA Basic Security AI Assistant Invoke AI [non-streaming, non-LangChain]', async () => {
    after(() => {
      objectRemover.removeAll();
    });

    describe('With Bedrock connector', () => {
      const simulator = new BedrockSimulator({
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      let apiUrl: string;
      let bedrockConnectorId: string;

      before(async () => {
        apiUrl = await simulator.start();
        bedrockConnectorId = await createConnector(
          supertest,
          getBedrockConnectorParams({ apiUrl })
        );
        objectRemover.add('default', bedrockConnectorId, 'connector', 'actions');
      });

      after(() => {
        simulator.close();
      });
      it('should execute a chat completion', async () => {
        const response = await postActionsClientExecute(bedrockConnectorId, mockRequest, supertest);

        const expected = {
          connector_id: bedrockConnectorId,
          data: 'Hello there! How may I assist you today?',
          status: 'ok',
        };

        expect(response.body).to.eql(expected);
      });
    });

    describe('With OpenAI connector', () => {
      const simulator = new OpenAISimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      let apiUrl: string;
      let openaiConnectorId: string;

      before(async () => {
        apiUrl = await simulator.start();
        openaiConnectorId = await createConnector(supertest, getOpenAIConnectorParams({ apiUrl }));
        objectRemover.add('default', openaiConnectorId, 'connector', 'actions');
      });

      after(() => {
        simulator.close();
      });
      it('should execute a chat completion', async () => {
        const response = await postActionsClientExecute(
          openaiConnectorId,
          { ...mockRequest, llmType: 'openai' },
          supertest
        );

        const expected = {
          connector_id: openaiConnectorId,
          data: 'Hello there! How may I assist you today?',
          status: 'ok',
        };

        expect(response.body).to.eql(expected);
      });
    });
  });
};

const mockRequest = {
  params: {
    subActionParams: {
      messages: [
        { role: 'user', content: '\\n\\n\\n\\nWhat is my name?' },
        {
          role: 'assistant',
          content:
            "I'm sorry, but I don't have the information about your name. You can tell me your name if you'd like, and we can continue our conversation from there.",
        },
        { role: 'user', content: '\\n\\nMy name is Andrew' },
        {
          role: 'assistant',
          content: "Hello, Andrew! It's nice to meet you. What would you like to talk about today?",
        },
        { role: 'user', content: '\\n\\nDo you know my name?' },
      ],
    },
    subAction: 'invokeAI',
  },
  isEnabledKnowledgeBase: false,
  isEnabledRAGAlerts: false,
  llmType: 'bedrock',
};

function getBedrockConnectorParams({ apiUrl }: { apiUrl: string }): CreateConnectorBody {
  return {
    name: 'A bedrock action',
    connector_type_id: '.bedrock',
    secrets: {
      accessKey: 'bedrockAccessKey',
      secret: 'bedrockSecret',
    },
    config: {
      defaultModel: 'anthropic.claude-v2',
      apiUrl,
    },
  };
}

function getOpenAIConnectorParams({ apiUrl }: { apiUrl: string }): CreateConnectorBody {
  return {
    name: 'An openai action',
    connector_type_id: '.gen-ai',
    secrets: {
      apiKey: 'genAiApiKey',
    },
    config: {
      apiProvider: 'OpenAI',
      apiUrl,
    },
  };
}
