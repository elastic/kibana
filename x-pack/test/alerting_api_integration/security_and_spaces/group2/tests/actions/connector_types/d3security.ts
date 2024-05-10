/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  D3SecuritySimulator,
  d3SecuritySuccessResponse,
} from '@kbn/actions-simulators-plugin/server/d3security_simulation';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const connectorTypeId = '.d3security';
const name = 'A D3 Security action';
const secrets = {
  token: 'token12345',
};

// eslint-disable-next-line import/no-default-export
export default function d3SecurityTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const createConnector = async (url: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { url },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('D3Security', () => {
    describe('action creation', () => {
      const simulator = new D3SecuritySimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { url: '' };

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

      it('should return 400 Bad Request when creating the connector without the url', async () => {
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
                'error validating action type config: [url]: expected value of type [string] but got [undefined]',
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
              url: 'http://d3security.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://d3security.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
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
        const simulator = new D3SecuritySimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let d3SecurityActionId: string;

        before(async () => {
          const url = await simulator.start();
          d3SecurityActionId = await createConnector(url);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${d3SecurityActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: d3SecurityActionId,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
            errorSource: TaskErrorSource.FRAMEWORK,
          });
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${d3SecurityActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: d3SecurityActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${d3SecurityActionId}. Connector name: D3 Security. Connector type: .d3security`,
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new D3SecuritySimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let url: string;
          let d3SecurityActionId: string;

          before(async () => {
            url = await simulator.start();
            d3SecurityActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should send a formatted JSON object', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${d3SecurityActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'test',
                  subActionParams: {
                    body: 'whoaradboddy',
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              hits: {
                hits: {
                  _source: {
                    'event.type': '',
                    'kibana.alert.severity': '',
                    rawData: 'whoaradboddy',
                  },
                },
              },
            });
            expect(body).to.eql({
              status: 'ok',
              connector_id: d3SecurityActionId,
              data: d3SecuritySuccessResponse,
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new D3SecuritySimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let d3SecurityActionId: string;

          before(async () => {
            const url = await simulator.start();
            d3SecurityActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when error happens', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${d3SecurityActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {},
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              connector_id: d3SecurityActionId,
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
