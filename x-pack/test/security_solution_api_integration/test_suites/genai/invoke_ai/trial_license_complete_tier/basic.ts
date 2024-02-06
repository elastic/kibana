/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../ftr_provider_context';
import { postActionsClientExecute } from '../utils/post_actions_client_execute';

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
  llmType: 'openai',
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const retry = getService('retry');
  const es = getService('es');

  describe('@ess @serverless Basic Security AI Assistant Invoke AI [non-streaming, non-LangChain]', async () => {
    const kibanaServer = getService('kibanaServer');

    beforeEach(async () => {});

    describe('With OpenAI connector', () => {
      it('should execute a chat completion', async () => {
        const response = await postActionsClientExecute('connectorId', mockRequest, supertest);
        const expected = {};
        expect(response).to.eql(expected);
      });
    });
  });
};
