/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  GeminiSimulator,
  geminiSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/gemini_simulation';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const connectorTypeId = '.gemini';
const name = 'A Gemini action';
const defaultConfig = {
  gcpRegion: 'us-central-1',
  gcpProjectID: 'test-project',
};
const secrets = {
  credentialsJSON: JSON.stringify({
    type: 'service_account',
    project_id: '',
    private_key_id: '',
    private_key: '-----BEGIN PRIVATE KEY----------END PRIVATE KEY-----\n',
    client_email: '',
    client_id: '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: '',
  }),
};

// eslint-disable-next-line import/no-default-export
export default function geminiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const createConnector = async (url: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { ...defaultConfig, url },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('Gemini', () => {
    describe('action creation', () => {
      const simulator = new GeminiSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { ...defaultConfig, url: '' };

      before(async () => {
        config.url = await simulator.start();
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
          is_system_action: false,
          is_deprecated: false,
          name,
          connector_type_id: connectorTypeId,
          is_missing_secrets: false,
          config,
        });
      });

      it('should return 400 Bad Request when creating the connector without the url, project id and region', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {},
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [url, gcpRegion, gcpProjectID]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without the project id', async () => {
        const testConfig = { gcpRegion: 'us-central-1', url: '' };
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            testConfig,
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [gcpProjectID]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without the region', async () => {
        const testConfig = { gcpProjectID: 'test-project', url: '' };
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            testConfig,
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [gcpRegion]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a url that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {
              url: 'http://gemini.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://gemini.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
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
                'error validating action type secrets: [token]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('executor', () => {
      describe('validation', () => {
        const simulator = new GeminiSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let geminiActionId: string;

        before(async () => {
          const url = await simulator.start();
          geminiActionId = await createConnector(url);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${geminiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: geminiActionId,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
            errorSource: TaskErrorSource.FRAMEWORK,
          });
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${geminiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: geminiActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${geminiActionId}. Connector name: Gemini. Connector type: .gemini`,
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new GeminiSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let url: string;
          let geminiActionId: string;

          before(async () => {
            url = await simulator.start();
            geminiActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should invoke AI with assistant AI body argument formatted to gemini expectations', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${geminiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'invokeAI',
                  subActionParams: {
                    contents: [
                      {
                        role: 'user',
                        parts: [
                          {
                            text: 'Hello',
                          },
                        ],
                      },
                      {
                        role: 'model',
                        parts: [
                          {
                            text: 'Hi there, how can I help you today?',
                          },
                        ],
                      },
                      {
                        role: 'user',
                        parts: [
                          {
                            text: 'Hello world!',
                          },
                        ],
                      },
                    ],
                    generation_config: { temperature: 0, maxOutputTokens: 8192 },
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: 'Hello world!' }],
                },
              ],
              generation_config: { temperature: 0, maxOutputTokens: 8192 },
            });
            expect(body).to.eql({
              status: 'ok',
              connector_id: geminiActionId,
              data: { completion: geminiSuccessResponse },
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new GeminiSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let geminiActionId: string;

          before(async () => {
            const url = await simulator.start();
            geminiActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when error happens', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${geminiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {},
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              connector_id: geminiActionId,
              message:
                'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
              retry: false,
              errorSource: TaskErrorSource.FRAMEWORK,
            });
          });
        });
      });
    });
  });
}
