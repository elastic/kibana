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
import type { FtrProviderContext } from '../ftr_provider_context';

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
          message: "No connector found for id 'do-not-exist'",
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
              message: "No connector found for id 'do-not-exist'",
              meta: {
                status: 400,
              },
            },
          },
        ]);
      });
    });
  });
};
