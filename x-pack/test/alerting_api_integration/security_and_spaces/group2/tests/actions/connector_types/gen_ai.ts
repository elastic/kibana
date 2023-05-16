/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  GenAiSimulator,
  genAiSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/gen_ai_simulation';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const goodUrl = 'https://some.non.existent.com'; // added to allowedHosts in the config for tests
const badUrl = 'https://any-other.com'; // added to allowedHosts in the config for tests

// eslint-disable-next-line import/no-default-export
export default function genAiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  describe('GenAi', () => {
    describe('action creation', () => {
      const simulator = new GenAiSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      let simulatorUrl: string;

      before(async () => {
        simulatorUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: simulatorUrl,
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          name: 'A GenAi action',
          connector_type_id: '.gen-ai',
          is_missing_secrets: false,
          config: {
            apiUrl: simulatorUrl,
            apiProvider: 'OpenAI',
          },
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiProvider', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: goodUrl,
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [apiProvider]: expected value of type [string] but got [undefined]',
            });
          });
      });
      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [apiUrl]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a apiUrl that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: badUrl,
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type config: error configuring Generative AI action: target url "${badUrl}" is not added to the Kibana config xpack.actions.allowedHosts`,
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: simulatorUrl,
              apiProvider: 'OpenAI',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiKey]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('executor', () => {
      describe('successful response simulator', () => {
        const simulator = new GenAiSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let simulatorUrl: string;
        let genAiActionId: string;

        before(async () => {
          simulatorUrl = await simulator.start();
          genAiActionId = await createConnector(simulatorUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should send a stringified JSON object', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                body: '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello world"}]}',
              },
            })
            .expect(200);

          expect(simulator.requestData).to.eql({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello world' }],
          });
          expect(body).to.eql({
            status: 'ok',
            connector_id: genAiActionId,
            data: genAiSuccessResponse,
          });
        });
      });

      describe('error response simulator', () => {
        const simulator = new GenAiSimulator({
          returnError: true,
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });

        let simulatorUrl: string;
        let genAiActionId: string;

        before(async () => {
          simulatorUrl = await simulator.start();
          genAiActionId = await createConnector(simulatorUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should return a failure when error happens', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            })
            .expect(200);

          expect(body).to.eql({
            status: 'error',
            message: 'error calling Generative AI, invalid response',
            connector_id: genAiActionId,
            service_message: '[422] Unprocessable Entity',
          });
        });
      });

      const createConnector = async (url: string) => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An GenAi simulator',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: url,
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        return body.id;
      };
    });
  });
}
