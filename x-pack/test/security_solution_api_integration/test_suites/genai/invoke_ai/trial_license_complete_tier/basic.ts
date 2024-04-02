/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { BedrockSimulator } from '@kbn/actions-simulators-plugin/server/bedrock_simulation';
import { OpenAISimulator } from '@kbn/actions-simulators-plugin/server/openai_simulation';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { postActionsClientExecute } from '../utils/post_actions_client_execute';
import { ObjectRemover } from '../utils/object_remover';
import { createConnector } from '../utils/create_connector';

const mockRequest = {
  message: 'Do you know my name?',
  subAction: 'invokeAI',
  isEnabledKnowledgeBase: false,
  isEnabledRAGAlerts: false,
  replacements: {},
};

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
      let bedrockActionId: string;

      before(async () => {
        apiUrl = await simulator.start();
        bedrockActionId = await createConnector(supertest, objectRemover, apiUrl, 'bedrock');
      });

      after(() => {
        simulator.close();
      });
      it('should execute a chat completion', async () => {
        const response = await postActionsClientExecute(bedrockActionId, mockRequest, supertest);

        const expected = {
          connector_id: bedrockActionId,
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
      let openaiActionId: string;

      before(async () => {
        apiUrl = await simulator.start();
        openaiActionId = await createConnector(supertest, objectRemover, apiUrl, 'openai');
      });

      after(() => {
        simulator.close();
      });
      it('should execute a chat completion', async () => {
        const response = await postActionsClientExecute(
          openaiActionId,
          { ...mockRequest },
          supertest
        );

        const expected = {
          connector_id: openaiActionId,
          data: 'Hello there! How may I assist you today?',
          status: 'ok',
        };

        expect(response.body).to.eql(expected);
      });
    });
  });
};
