/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { ResilientSimulator } from '@kbn/actions-simulators-plugin/server/resilient_simulation';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function resilientTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const mockResilient = {
    config: {
      apiUrl: 'www.resilientisinkibanaactions.com',
      orgId: '201',
    },
    secrets: {
      apiKeyId: 'key',
      apiKeySecret: 'secret',
    },
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          name: 'a title',
          description: 'a description',
          incidentTypes: [1001],
          severityCode: 6,
          externalId: null,
        },
        comments: [
          {
            comment: 'first comment',
            commentId: '456',
          },
        ],
      },
    },
  };

  describe('IBM Resilient', () => {
    describe('IBM Resilient - Action Creation', () => {
      const simulator = new ResilientSimulator({
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });

      let resilientSimulatorURL: string = '<could not determine kibana url>';

      before(async () => {
        resilientSimulatorURL = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating a ibm resilient connector successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient action',
            connector_type_id: '.resilient',
            config: {
              ...mockResilient.config,
              apiUrl: resilientSimulatorURL,
            },
            secrets: mockResilient.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'An IBM Resilient action',
          connector_type_id: '.resilient',
          is_missing_secrets: false,
          config: {
            apiUrl: resilientSimulatorURL,
            orgId: mockResilient.config.orgId,
          },
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'An IBM Resilient action',
          connector_type_id: '.resilient',
          is_missing_secrets: false,
          config: {
            apiUrl: resilientSimulatorURL,
            orgId: mockResilient.config.orgId,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            connector_type_id: '.resilient',
            config: { orgId: '201' },
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

      it('should respond with a 400 Bad Request when creating a ibm resilient action with no orgId', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            connector_type_id: '.resilient',
            config: { apiUrl: resilientSimulatorURL },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [orgId]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action with a not present in allowedHosts apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            connector_type_id: '.resilient',
            config: {
              apiUrl: 'http://resilient.mynonexistent.com',
              orgId: mockResilient.config.orgId,
            },
            secrets: mockResilient.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://resilient.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            connector_type_id: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
              orgId: mockResilient.config.orgId,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiKeyId]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('IBM Resilient - Executor', () => {
      describe('Validation', () => {
        const simulator = new ResilientSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });

        let resilientActionId: string;
        let resilientSimulatorURL: string = '<could not determine kibana url>';

        before(async () => {
          resilientSimulatorURL = await simulator.start();
          resilientActionId = await createConnector(resilientSimulatorURL);
        });

        after(() => {
          simulator.close();
        });

        it('should handle failing with a simulated success without action', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            })
            .then((resp: any) => {
              expect(Object.keys(resp.body)).to.eql([
                'status',
                'message',
                'retry',
                'errorSource',
                'connector_id',
              ]);
              expect(resp.body.connector_id).to.eql(resilientActionId);
              expect(resp.body.status).to.eql('error');
            });
        });

        it('should handle failing with a simulated success without unsupported action', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'non-supported' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: resilientActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message: `Sub action "non-supported" is not registered. Connector id: ${resilientActionId}. Connector name: IBM Resilient. Connector type: .resilient`,
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });

        it('should handle failing with a simulated success without subActionParams', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: resilientActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message:
                  'Request validation failed (Error: [incident.name]: expected value of type [string] but got [undefined])',
                errorSource: TaskErrorSource.USER,
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  incident: {
                    description: 'success',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: resilientActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message:
                  'Request validation failed (Error: [incident.name]: expected value of type [string] but got [undefined])',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  incident: {
                    ...mockResilient.params.subActionParams.incident,
                    name: 'success',
                  },
                  comments: [{ comment: 'comment' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: resilientActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message:
                  'Request validation failed (Error: [comments]: types that failed validation:\n- [comments.0.0.commentId]: expected value of type [string] but got [undefined]\n- [comments.1]: expected value to equal [null])',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'pushToService',
                subActionParams: {
                  incident: {
                    ...mockResilient.params.subActionParams.incident,
                    name: 'success',
                  },
                  comments: [{ commentId: 'success' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: resilientActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.USER,
                service_message:
                  'Request validation failed (Error: [comments]: types that failed validation:\n- [comments.0.0.comment]: expected value of type [string] but got [undefined]\n- [comments.1]: expected value to equal [null])',
              });
            });
        });
      });

      describe('Execution', () => {
        const simulator = new ResilientSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });

        let simulatorUrl: string;
        let resilientActionId: string;

        before(async () => {
          simulatorUrl = await simulator.start();
          resilientActionId = await createConnector(simulatorUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should handle creating an incident without comments', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${resilientActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  ...mockResilient.params.subActionParams,
                  comments: null,
                },
              },
            })
            .expect(200);

          expect(body).to.eql({
            status: 'ok',
            connector_id: resilientActionId,
            data: {
              id: '123',
              title: '123',
              pushedDate: '2020-05-13T17:44:34.472Z',
              url: `${simulatorUrl}/#incidents/123`,
            },
          });
        });
      });

      const createConnector = async (url: string) => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A resilient action',
            connector_type_id: '.resilient',
            config: { ...mockResilient.config, apiUrl: url },
            secrets: mockResilient.secrets,
          })
          .expect(200);

        return body.id;
      };
    });
  });
}
