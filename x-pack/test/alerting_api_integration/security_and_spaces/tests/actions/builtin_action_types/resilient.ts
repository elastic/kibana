/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

const mapping = [
  {
    source: 'title',
    target: 'name',
    actionType: 'overwrite',
  },
  {
    source: 'description',
    target: 'description',
    actionType: 'overwrite',
  },
  {
    source: 'comments',
    target: 'comments',
    actionType: 'append',
  },
];

// eslint-disable-next-line import/no-default-export
export default function resilientTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const mockResilient = {
    config: {
      apiUrl: 'www.jiraisinkibanaactions.com',
      orgId: '201',
      casesConfiguration: { mapping },
    },
    secrets: {
      apiKeyId: 'key',
      apiKeySecret: 'secret',
    },
    params: {
      subAction: 'pushToService',
      subActionParams: {
        savedObjectId: '123',
        title: 'a title',
        description: 'a description',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        updatedAt: null,
        updatedBy: null,
        externalId: null,
        comments: [
          {
            commentId: '456',
            version: 'WzU3LDFd',
            comment: 'first comment',
            createdAt: '2020-03-13T08:34:53.450Z',
            createdBy: { fullName: 'Elastic User', username: 'elastic' },
            updatedAt: null,
            updatedBy: null,
          },
        ],
      },
    },
  };

  let resilientSimulatorURL: string = '<could not determine kibana url>';

  describe('IBM Resilient', () => {
    before(() => {
      resilientSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.RESILIENT)
      );
    });

    describe('IBM Resilient - Action Creation', () => {
      it('should return 200 when creating a ibm resilient action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient action',
            actionTypeId: '.resilient',
            config: {
              ...mockResilient.config,
              apiUrl: resilientSimulatorURL,
            },
            secrets: mockResilient.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          isPreconfigured: false,
          name: 'An IBM Resilient action',
          actionTypeId: '.resilient',
          config: {
            apiUrl: resilientSimulatorURL,
            orgId: mockResilient.config.orgId,
            casesConfiguration: mockResilient.config.casesConfiguration,
          },
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/action/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          isPreconfigured: false,
          name: 'An IBM Resilient action',
          actionTypeId: '.resilient',
          config: {
            apiUrl: resilientSimulatorURL,
            orgId: mockResilient.config.orgId,
            casesConfiguration: mockResilient.config.casesConfiguration,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
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
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
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

      it('should respond with a 400 Bad Request when creating a ibm resilient action with a non whitelisted apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
            config: {
              apiUrl: 'http://resilient.mynonexistent.com',
              orgId: mockResilient.config.orgId,
              casesConfiguration: mockResilient.config.casesConfiguration,
            },
            secrets: mockResilient.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring connector action: target url "http://resilient.mynonexistent.com" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action without secrets', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
              orgId: mockResilient.config.orgId,
              casesConfiguration: mockResilient.config.casesConfiguration,
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

      it('should respond with a 400 Bad Request when creating a ibm resilient action without casesConfiguration', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
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
                'error validating action type config: [casesConfiguration.mapping]: expected value of type [array] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action with empty mapping', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
              orgId: mockResilient.config.orgId,
              casesConfiguration: { mapping: [] },
            },
            secrets: mockResilient.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [casesConfiguration.mapping]: expected non-empty but got empty',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a ibm resilient action with wrong actionType', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
              orgId: mockResilient.config.orgId,
              casesConfiguration: {
                mapping: [
                  {
                    source: 'title',
                    target: 'description',
                    actionType: 'non-supported',
                  },
                ],
              },
            },
            secrets: mockResilient.secrets,
          })
          .expect(400);
      });
    });

    describe('IBM Resilient - Executor', () => {
      let simulatedActionId: string;
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A ibm resilient simulator',
            actionTypeId: '.resilient',
            config: {
              apiUrl: resilientSimulatorURL,
              orgId: mockResilient.config.orgId,
              casesConfiguration: mockResilient.config.casesConfiguration,
            },
            secrets: mockResilient.secrets,
          });
        simulatedActionId = body.id;
      });

      describe('Validation', () => {
        it('should handle failing with a simulated success without action', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message: `error validating action params: Cannot read property 'Symbol(Symbol.iterator)' of undefined`,
              });
            });
        });

        it('should handle failing with a simulated success without unsupported action', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'non-supported' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subAction]: expected value to equal [pushToService]',
              });
            });
        });

        it('should handle failing with a simulated success without subActionParams', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.savedObjectId]: expected value of type [string] but got [undefined]',
              });
            });
        });

        it('should handle failing with a simulated success without savedObjectId', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService', subActionParams: {} },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.savedObjectId]: expected value of type [string] but got [undefined]',
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  savedObjectId: 'success',
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.title]: expected value of type [string] but got [undefined]',
              });
            });
        });

        it('should handle failing with a simulated success without createdAt', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  savedObjectId: 'success',
                  title: 'success',
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.createdAt]: expected value of type [string] but got [undefined]',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  ...mockResilient.params.subActionParams,
                  savedObjectId: 'success',
                  title: 'success',
                  createdAt: 'success',
                  createdBy: { username: 'elastic' },
                  comments: [{}],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  ...mockResilient.params.subActionParams,
                  savedObjectId: 'success',
                  title: 'success',
                  createdAt: 'success',
                  createdBy: { username: 'elastic' },
                  comments: [{ commentId: 'success' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]',
              });
            });
        });

        it('should handle failing with a simulated success without comment.createdAt', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  ...mockResilient.params.subActionParams,
                  savedObjectId: 'success',
                  title: 'success',
                  createdAt: 'success',
                  createdBy: { username: 'elastic' },
                  comments: [{ commentId: 'success', comment: 'success' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.createdAt]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]',
              });
            });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident without comments', async () => {
          const { body } = await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockResilient.params,
                subActionParams: {
                  ...mockResilient.params.subActionParams,
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(body).to.eql({
            status: 'ok',
            actionId: simulatedActionId,
            data: {
              id: '123',
              title: '123',
              pushedDate: '2020-05-13T17:44:34.472Z',
              url: `${resilientSimulatorURL}/#incidents/123`,
            },
          });
        });
      });
    });
  });
}
