/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import {
  OpsgenieSimulator,
  opsgenieSuccessResponse,
} from '../../../../../../common/fixtures/plugins/actions_simulators/server/opsgenie_simulation';

// eslint-disable-next-line import/no-default-export
export default function opsgenieTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  describe('Opsgenie', () => {
    describe('action creation', () => {
      const simulator = new OpsgenieSimulator({
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
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: simulatorUrl,
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
          name: 'An opsgenie action',
          connector_type_id: '.opsgenie',
          is_missing_secrets: false,
          config: {
            apiUrl: simulatorUrl,
          },
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {},
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
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: 'http://opsgenie.mynonexistent.com',
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
                'error validating action type config: error validating url: target url "http://opsgenie.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An opsgenie action',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: simulatorUrl,
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
      describe('validation', () => {
        describe('error response', () => {
          const simulator = new OpsgenieSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let simulatorUrl: string;
          let opsgenieActionId: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            opsgenieActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should fail when the params is empty', async () => {
            await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {},
              })
              .then((resp: any) => {
                expect(Object.keys(resp.body)).to.eql([
                  'status',
                  'message',
                  'retry',
                  'connector_id',
                ]);
                expect(resp.body.connector_id).to.eql(opsgenieActionId);
                expect(resp.body.status).to.eql('error');
              });
          });

          it('should fail when the subAction is invalid', async () => {
            await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'invalidAction' },
              })
              .then((resp: any) => {
                expect(resp.body).to.eql({
                  connector_id: opsgenieActionId,
                  status: 'error',
                  retry: false,
                  message: 'an error occurred while running the action',
                  service_message: `Sub action "invalidAction" is not registered. Connector id: ${opsgenieActionId}. Connector name: Opsgenie. Connector type: .opsgenie`,
                });
              });
          });

          it("should fail to create an alert when the message parameter isn't included", async () => {
            await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'createAlert', subActionParams: {} },
              })
              .then((resp: any) => {
                expect(resp.body).to.eql({
                  connector_id: opsgenieActionId,
                  status: 'error',
                  retry: false,
                  message: 'an error occurred while running the action',
                  service_message:
                    'Request validation failed (Error: [message]: expected value of type [string] but got [undefined])',
                });
              });
          });

          it("should fail to close an alert when the alias parameter isn't included", async () => {
            await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: {} },
              })
              .then((resp: any) => {
                expect(resp.body).to.eql({
                  connector_id: opsgenieActionId,
                  status: 'error',
                  retry: false,
                  message: 'an error occurred while running the action',
                  service_message:
                    'Request validation failed (Error: [alias]: expected value of type [string] but got [undefined])',
                });
              });
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new OpsgenieSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let simulatorUrl: string;
          let opsgenieActionId: string;
          let createAlertUrl: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            createAlertUrl = createUrlString(simulatorUrl, 'v2/alerts');
            opsgenieActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'createAlert', subActionParams: { message: 'message' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message' });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: opsgenieActionId,
              data: opsgenieSuccessResponse,
            });
          });

          it('should preserve the alias when it is 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: opsgenieActionId,
              data: opsgenieSuccessResponse,
            });
          });

          it('should sha256 hash the alias when it is over 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(513);

            // sha256 hash for 513 a characters
            const hashedAlias = '02425c0f5b0dabf3d2b9115f3f7723a02ad8bcfb1534a0d231614fd42b8188f6';

            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias: hashedAlias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: opsgenieActionId,
              data: opsgenieSuccessResponse,
            });
          });

          it('should close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias: '123' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, 'v2/alerts/123/close')
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: opsgenieActionId,
              data: opsgenieSuccessResponse,
            });
          });

          it('should close an alert with an alias that is 512 characters', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, `v2/alerts/${alias}/close`)
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: opsgenieActionId,
              data: opsgenieSuccessResponse,
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new OpsgenieSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let simulatorUrl: string;
          let opsgenieActionId: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            opsgenieActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when attempting to create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', note: 'a note' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', note: 'a note' });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: false,
              connector_id: opsgenieActionId,
              service_message: 'Message: failed.',
            });
          });

          it('should return a failure when attempting to close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${opsgenieActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeAlert',
                  subActionParams: { note: 'a note', alias: '123' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ note: 'a note' });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: false,
              connector_id: opsgenieActionId,
              service_message: 'Message: failed.',
            });
          });
        });
      });

      const createConnector = async (url: string) => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An Opsgenie simulator',
            connector_type_id: '.opsgenie',
            config: {
              apiUrl: url,
            },
            secrets: {
              apiKey: '123',
            },
          });

        return body.id;
      };
    });
  });
}

const createCloseAlertUrl = (baseUrl: string, path: string) => {
  return createUrlString(baseUrl, path, { identifierType: 'alias' });
};

const createUrlString = (baseUrl: string, path: string, queryParams?: Record<string, string>) => {
  const fullURL = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(queryParams ?? {})) {
    fullURL.searchParams.set(key, value);
  }

  return fullURL.toString();
};
