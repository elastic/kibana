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

const connectorTypeId = '.gen-ai';
const name = 'A genAi action';
const secrets = {
  apiKey: 'genAiApiKey',
};

const defaultConfig = { apiProvider: 'OpenAI' };

// eslint-disable-next-line import/no-default-export
export default function genAiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const createConnector = async (apiUrl: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { ...defaultConfig, apiUrl },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('GenAi', () => {
    describe('action creation', () => {
      const simulator = new GenAiSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { ...defaultConfig, apiUrl: '' };

      before(async () => {
        config.apiUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
            secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          name,
          connector_type_id: connectorTypeId,
          is_missing_secrets: false,
          config,
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
              apiUrl: config.apiUrl,
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
            name,
            connector_type_id: connectorTypeId,
            config: defaultConfig,
            secrets,
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
            name,
            connector_type_id: connectorTypeId,
            config: {
              ...defaultConfig,
              apiUrl: 'http://genAi.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: Error configuring Generative AI action: Error: error validating url: target url "http://genAi.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
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
      describe('validation', () => {
        const simulator = new GenAiSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let genAiActionId: string;

        before(async () => {
          const apiUrl = await simulator.start();
          genAiActionId = await createConnector(apiUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: genAiActionId,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
          });
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: genAiActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${genAiActionId}. Connector name: Generative AI. Connector type: .gen-ai`,
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new GenAiSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let apiUrl: string;
          let genAiActionId: string;

          before(async () => {
            apiUrl = await simulator.start();
            genAiActionId = await createConnector(apiUrl);
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
                  subAction: 'test',
                  subActionParams: {
                    body: '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello world"}]}',
                  },
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

          let genAiActionId: string;

          before(async () => {
            const apiUrl = await simulator.start();
            genAiActionId = await createConnector(apiUrl);
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
              connector_id: genAiActionId,
              message:
                'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
              retry: false,
            });
          });
        });
      });
    });
  });
}
