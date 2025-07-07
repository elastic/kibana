/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  FunctionDefinition,
  MessageRole,
  type Message,
} from '@kbn/observability-ai-assistant-plugin/common';
import {
  MessageAddEvent,
  type StreamingChatResponseEvent,
} from '@kbn/observability-ai-assistant-plugin/common/conversation_complete';
import { type Instruction } from '@kbn/observability-ai-assistant-plugin/common/types';
import { createLlmProxy, LlmProxy } from '../utils/create_llm_proxy';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';
import { decodeEvents } from '../utils/conversation';

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const log = getService('log');
  const observabilityAIAssistantAPIClient = getService('observabilityAIAssistantApi');

  const messages: Message[] = [
    {
      '@timestamp': new Date().toISOString(),
      message: {
        role: MessageRole.User,
        content: 'Good morning, bot!',
      },
    },
  ];

  describe('/api/observability_ai_assistant/chat/complete', function () {
    // Fails on MKI: https://github.com/elastic/kibana/issues/205581
    this.tags(['skipCloud']);
    let llmProxy: LlmProxy;
    let connectorId: string;

    async function callPublicChatComplete({
      actions,
      instructions,
      format = 'default',
      persist = true,
    }: {
      actions?: Array<Pick<FunctionDefinition, 'name' | 'description' | 'parameters'>>;
      instructions?: Array<string | Instruction>;
      format?: 'openai' | 'default';
      persist?: boolean;
    }) {
      const response = await observabilityAIAssistantAPIClient.admin({
        endpoint: 'POST /api/observability_ai_assistant/chat/complete 2023-10-31',
        params: {
          query: { format },
          body: {
            messages,
            connectorId,
            persist,
            actions,
            instructions,
          },
        },
      });

      return String(response.body);
    }

    before(async () => {
      llmProxy = await createLlmProxy(log);
      connectorId = await observabilityAIAssistantAPIClient.createProxyActionConnector({
        port: llmProxy.getPort(),
      });
    });

    after(async () => {
      await observabilityAIAssistantAPIClient.deleteActionConnector({
        actionId: connectorId,
      });
      llmProxy.close();
    });

    const action = {
      name: 'my_action',
      description: 'My action',
      parameters: {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
      },
    } as const;

    afterEach(async () => {
      llmProxy.clear();
    });

    describe('after executing an action and closing the stream', () => {
      let events: StreamingChatResponseEvent[];

      before(async () => {
        void llmProxy.interceptTitle('My Title');
        void llmProxy.interceptWithFunctionRequest({
          name: 'my_action',
          arguments: () => JSON.stringify({ foo: 'bar' }),
        });

        const responseBody = await callPublicChatComplete({
          actions: [action],
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();

        events = decodeEvents(responseBody);
      });

      it('does not persist the conversation (the last event is not a conversationUpdated event)', () => {
        const lastEvent = events[events.length - 1] as MessageAddEvent;
        expect(lastEvent.type).to.not.be('conversationUpdate');
        expect(lastEvent.type).to.be('messageAdd');
        expect(lastEvent.message.message.function_call).to.eql({
          name: 'my_action',
          arguments: JSON.stringify({ foo: 'bar' }),
          trigger: MessageRole.Assistant,
        });
      });
    });

    describe('after adding an instruction', () => {
      before(async () => {
        void llmProxy.interceptWithFunctionRequest({
          name: 'my_action',
          arguments: () => JSON.stringify({ foo: 'bar' }),
        });

        await callPublicChatComplete({
          instructions: ['This is a random instruction'],
          actions: [action],
          persist: false,
        });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      it('includes the instruction in the system message', async () => {
        const { requestBody } = llmProxy.interceptedRequests[0];
        expect(requestBody.messages[0].content).to.contain('This is a random instruction');
      });
    });

    describe('with openai format', () => {
      let responseBody: string;

      before(async () => {
        void llmProxy.interceptTitle('My Title');
        void llmProxy.interceptWithResponse('Hello');

        responseBody = await callPublicChatComplete({ format: 'openai' });

        await llmProxy.waitForAllInterceptorsToHaveBeenCalled();
      });

      function extractDataParts(lines: string[]) {
        return lines.map((line) => {
          // .replace is easier, but we want to verify here whether
          // it matches the SSE syntax (`data: ...`)
          const [, dataPart] = line.match(/^data: (.*)$/) || ['', ''];
          return dataPart.trim();
        });
      }

      function getLines(str: string) {
        return str.split('\n\n').filter(Boolean);
      }

      it('outputs each line an SSE-compatible format (data: ...)', () => {
        const lines = getLines(responseBody);

        lines.forEach((line) => {
          expect(line.match(/^data: /));
        });
      });

      it('ouputs one chunk, and one [DONE] event', () => {
        const dataParts = extractDataParts(getLines(responseBody));

        expect(dataParts[0]).not.to.be.empty();
        expect(dataParts[1]).to.be('[DONE]');
      });

      it('outuputs an OpenAI-compatible chunk', () => {
        const [dataLine] = extractDataParts(getLines(responseBody));

        expect(() => {
          JSON.parse(dataLine);
        }).not.to.throwException();

        const parsedChunk = JSON.parse(dataLine);

        expect(parsedChunk).to.eql({
          model: 'unknown',
          choices: [
            {
              delta: {
                content: 'Hello',
              },
              finish_reason: null,
              index: 0,
            },
          ],
          object: 'chat.completion.chunk',
          // just test that these are a string and a number
          id: String(parsedChunk.id),
          created: Number(parsedChunk.created),
        });
      });
    });
  });
}
