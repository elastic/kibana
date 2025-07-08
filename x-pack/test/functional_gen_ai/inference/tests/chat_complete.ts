/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom, toArray } from 'rxjs';
import expect from '@kbn/expect';
import { supertestToObservable } from '@kbn/sse-utils-server';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type SuperTest from 'supertest';
import { aiAssistantAnonymizationSettings } from '@kbn/inference-common';
import type { FtrProviderContext } from '../ftr_provider_context';

export const setAdvancedSettings = async (
  supertest: SuperTest.Agent,
  settings: Record<string, string[] | string | number | boolean | object>
) => {
  return supertest
    .post('/internal/kibana/settings')
    .set('kbn-xsrf', 'true')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .send({ changes: settings })
    .expect(200);
};
const emailRule = {
  entityClass: 'EMAIL',
  type: 'RegExp',
  pattern: '([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})',
  enabled: true,
};

export const chatCompleteSuite = (
  { id: connectorId, actionTypeId: connectorType }: AvailableConnectorWithId,
  { getService }: FtrProviderContext
) => {
  const supertest = getService('supertest');

  describe('chatComplete API', () => {
    describe('streaming disabled', () => {
      it('returns a chat completion message for a simple prompt', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            temperature: 0.1,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const message = response.body;

        expect(message.toolCalls.length).to.eql(0);
        expect(message.content).to.contain('4');
      });

      it('executes a tool with native function calling', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system:
              'Please answer the user question. You can use the available tools if you think it can help',
            messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
            toolChoice: 'required',
            tools: {
              calculator: {
                description: 'The calculator can be used to resolve mathematical calculations',
                schema: {
                  type: 'object',
                  properties: {
                    formula: {
                      type: 'string',
                      description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const message = response.body;

        expect(message.toolCalls.length).to.eql(1);
        expect(message.toolCalls[0].function.name).to.eql('calculator');
        expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
      });

      // simulated FC is only for openAI
      if (connectorType === '.gen-ai') {
        it('executes a tool with simulated function calling', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              system:
                'Please answer the user question. You can use the available tools if you think it can help',
              messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
              functionCalling: 'simulated',
              toolChoice: 'required',
              tools: {
                calculator: {
                  description: 'The calculator can be used to resolve mathematical calculations',
                  schema: {
                    type: 'object',
                    properties: {
                      formula: {
                        type: 'string',
                        description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                      },
                    },
                  },
                },
              },
            })
            .expect(200);

          const message = response.body;

          expect(message.toolCalls.length).to.eql(1);
          expect(message.toolCalls[0].function.name).to.eql('calculator');
          expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
        });
      }

      it('returns token counts', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const { tokens } = response.body;

        expect(tokens.prompt).to.be.greaterThan(0);
        expect(tokens.completion).to.be.greaterThan(0);
        expect(tokens.total).eql(tokens.prompt + tokens.completion);
      });

      it('returns an error with the expected shape in case of error', async () => {
        const response = await supertest
          .post(`/internal/inference/chat_complete`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId: 'do-not-exist',
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(400);

        const message = response.body;

        expect(message).to.eql({
          type: 'error',
          code: 'requestError',
          message:
            "No connector found for id 'do-not-exist'\nSaved object [action/do-not-exist] not found",
        });
      });

      describe('anonymization enabled', () => {
        before(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [emailRule] }, null, 2),
          });
        });
        after(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [] }),
          });
        });
        it('returns a chat completion message with deanonymization data', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);
          const message = response.body;
          expect(message.deanonymized_input[0].deanonymizations[0].entity.value).to.be(
            'jorge@gmail.com'
          );
          const emailMask = message.deanonymized_output.deanonymizations[0].entity.mask;
          expect(message.content.includes(emailMask)).to.be(false);
        });
      });
      describe('anonymization disabled', () => {
        before(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [] }),
          });
        });
        it('returns a chat completion message without deanonymization data', async () => {
          const response = await supertest
            .post(`/internal/inference/chat_complete`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);

          const message = response.body;
          expect(message.deanonymized_input).to.be(undefined);
          expect(message.deanonymized_output).to.be(undefined);
        });
      });
    });

    describe('streaming enabled', () => {
      it('returns a chat completion message for a simple prompt', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            temperature: 0.1,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const message = await lastValueFrom(observable);

        expect({
          ...message,
          content: '',
        }).to.eql({ type: 'chatCompletionMessage', content: '', toolCalls: [] });
        expect(message.content).to.contain('4');
      });

      it('executes a tool when explicitly requested', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system:
              'Please answer the user question. You can use the available tools if you think it can help',
            messages: [{ role: 'user', content: 'What is the result of 2*4*6*8*10*123 ?' }],
            toolChoice: 'required',
            tools: {
              calculator: {
                description: 'The calculator can be used to resolve mathematical calculations',
                schema: {
                  type: 'object',
                  properties: {
                    formula: {
                      type: 'string',
                      description: `The input for the calculator, in plain text, e.g. "2+(4*8)"`,
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const message = await lastValueFrom(observable);

        expect(message.toolCalls.length).to.eql(1);
        expect(message.toolCalls[0].function.name).to.eql('calculator');
        expect(message.toolCalls[0].function.arguments.formula).to.contain('123');
      });

      it('returns a token count event', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId,
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const events = await lastValueFrom(observable.pipe(toArray()));
        const tokenEvent = events[events.length - 2];

        expect(tokenEvent.type).to.eql('chatCompletionTokenCount');
        expect(tokenEvent.tokens.prompt).to.be.greaterThan(0);
        expect(tokenEvent.tokens.completion).to.be.greaterThan(0);
        expect(tokenEvent.tokens.total).to.be(
          tokenEvent.tokens.prompt + tokenEvent.tokens.completion
        );
      });

      it('returns an error with the expected shape in case of error', async () => {
        const response = supertest
          .post(`/internal/inference/chat_complete/stream`)
          .set('kbn-xsrf', 'kibana')
          .send({
            connectorId: 'do-not-exist',
            system: 'Please answer the user question',
            messages: [{ role: 'user', content: '2+2 ?' }],
          })
          .expect(200);

        const observable = supertestToObservable(response);

        const events = await lastValueFrom(observable.pipe(toArray()));

        expect(events).to.eql([
          {
            type: 'error',
            error: {
              code: 'requestError',
              message:
                "No connector found for id 'do-not-exist'\nSaved object [action/do-not-exist] not found",
              meta: {
                status: 400,
              },
            },
          },
        ]);
      });

      describe('anonymization disabled', () => {
        before(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [] }),
          });
        });
        it('returns events without deanonymization data and streams', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com. What is my email?' },
              ],
            })
            .expect(200);

          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));
          // Should have multiple chunk events (confirming it's streaming)
          const chunkEvents = events.filter((event) => event.type === 'chatCompletionChunk');
          expect(chunkEvents.length).to.be.greaterThan(1);
          const messageEvent = events.find((event) => event.type === 'chatCompletionMessage');
          expect(messageEvent.deanonymized_input).to.be(undefined);
          expect(messageEvent.deanonymized_output).to.be(undefined);
        });
      });

      describe('anonymization enabled', () => {
        before(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [emailRule] }, null, 2),
          });
        });
        after(async () => {
          await setAdvancedSettings(supertest, {
            [aiAssistantAnonymizationSettings]: JSON.stringify({ rules: [] }),
          });
        });
        it('returns a chat completion message with deanonymization data and does not stream the response', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [
                { role: 'user', content: 'My email is jorge@gmail.com.  what is my email?' },
              ],
            })
            .expect(200);
          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));
          expect(events.length).to.eql(3);
          const chatCompletionChunks = events.filter(
            (event) => event.type === 'chatCompletionChunk'
          );
          expect(chatCompletionChunks.length).to.eql(1);
          const chatCompletionMessage = events.filter(
            (event) => event.type === 'chatCompletionMessage'
          );
          expect(chatCompletionMessage.length).to.eql(1);
          const relevantEvents = chatCompletionMessage.concat(chatCompletionChunks);
          relevantEvents.forEach((event) => {
            expect(event.deanonymized_input[0].deanonymizations[0].entity.value).to.be(
              'jorge@gmail.com'
            );
            const emailMask = event.deanonymized_output.deanonymizations[0].entity.mask;
            expect(event.content.includes(emailMask)).to.be(false);
          });
        });

        it('streams normally when no PII is detected even with rules enabled', async () => {
          const response = supertest
            .post(`/internal/inference/chat_complete/stream`)
            .set('kbn-xsrf', 'kibana')
            .send({
              connectorId,
              temperature: 0.1,
              system: 'Please answer the user question',
              messages: [{ role: 'user', content: 'What is 2+2? No personal information here.' }],
            })
            .expect(200);

          const observable = supertestToObservable(response);
          const events = await lastValueFrom(observable.pipe(toArray()));

          const messageEvent = events.find((event) => event.type === 'chatCompletionMessage');
          expect(messageEvent.deanonymized_input).to.be(undefined);
          expect(messageEvent.deanonymized_output).to.be(undefined);

          // Should have multiple chunk events (confirming it's streaming)
          const chunkEvents = events.filter((event) => event.type === 'chatCompletionChunk');
          expect(chunkEvents.length).to.be.greaterThan(1);
        });
      });
    });
  });
};
