/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { TheHiveSimulator } from '@kbn/actions-simulators-plugin/server/thehive_simulation';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

const connectorTypeId = '.thehive';
const name = 'TheHive action';
const secrets = {
  apiKey: 'token12345',
};

// eslint-disable-next-line import/no-default-export
export default function theHiveTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const createConnector = async (url: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { url, organisation: null },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('TheHive', () => {
    describe('action creation', () => {
      const simulator = new TheHiveSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { url: '', organisation: null };

      before(async () => {
        config.url = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector without organisation', async () => {
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

      it('should return 200 when creating the connector with the organisation', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: { ...config, organisation: 'test-organisation' },
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
          config: { ...config, organisation: 'test-organisation' },
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
              url: 'http://thehive.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://thehive.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
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
        const simulator = new TheHiveSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let theHiveActionId: string;

        before(async () => {
          const url = await simulator.start();
          theHiveActionId = await createConnector(url);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${theHiveActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: theHiveActionId,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
            errorSource: TaskErrorSource.USER,
          });
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${theHiveActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: theHiveActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${theHiveActionId}. Connector name: TheHive. Connector type: .thehive`,
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new TheHiveSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let url: string;
          let theHiveActionId: string;

          before(async () => {
            url = await simulator.start();
            theHiveActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should send a formatted JSON object', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${theHiveActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'pushToService',
                  subActionParams: {
                    incident: {
                      title: 'title',
                      description: 'description',
                      tlp: 2,
                      severity: 1,
                      tags: ['tag1', 'tag2'],
                    },
                    comments: [],
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              title: 'title',
              description: 'description',
              tlp: 2,
              severity: 1,
              tags: ['tag1', 'tag2'],
            });

            expect(body).to.eql({
              status: 'ok',
              connector_id: theHiveActionId,
              data: {
                id: '~172064',
                title: 'title',
                url: `${url}/cases/~172064/details`,
                pushedDate: new Date(1712128153041).toISOString(),
              },
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new TheHiveSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let theHiveActionId: string;

          before(async () => {
            const url = await simulator.start();
            theHiveActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when error happens', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${theHiveActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {},
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              connector_id: theHiveActionId,
              message:
                'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
              retry: false,
              errorSource: TaskErrorSource.USER,
            });
          });
        });
      });
    });
  });
}
