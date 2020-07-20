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
    target: 'short_description',
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
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');

  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
      incidentConfiguration: { mapping },
      isCaseOwned: true,
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
    params: {
      subAction: 'pushToService',
      subActionParams: {
        savedObjectId: '123',
        createdAt: '2020-03-13T08:34:53.450Z',
        createdBy: { fullName: 'Elastic User', username: 'elastic' },
        comments: [
          {
            commentId: '456',
            comment: 'first comment',
            createdAt: '2020-03-13T08:34:53.450Z',
            createdBy: { fullName: 'Elastic User', username: 'elastic' },
            updatedAt: null,
            updatedBy: null,
          },
        ],
        description: 'a description',
        externalId: null,
        title: 'a title',
        updatedAt: '2020-06-17T04:37:45.147Z',
        updatedBy: { fullName: null, username: 'elastic' },
      },
    },
  };

  let servicenowSimulatorURL: string = '<could not determine kibana url>';

  describe('ServiceNow', () => {
    before(() => {
      servicenowSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.SERVICENOW)
      );
    });

    describe('ServiceNow - Action Creation', () => {
      it('should return 200 when creating a servicenow action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              incidentConfiguration: mockServiceNow.config.incidentConfiguration,
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          isPreconfigured: false,
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
            incidentConfiguration: mockServiceNow.config.incidentConfiguration,
            isCaseOwned: true,
          },
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/action/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          isPreconfigured: false,
          name: 'A servicenow action',
          actionTypeId: '.servicenow',
          config: {
            apiUrl: servicenowSimulatorURL,
            incidentConfiguration: mockServiceNow.config.incidentConfiguration,
            isCaseOwned: true,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a servicenow action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {},
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

      it('should respond with a 400 Bad Request when creating a servicenow action with a non whitelisted apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: 'http://servicenow.mynonexistent.com',
              incidentConfiguration: mockServiceNow.config.incidentConfiguration,
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring connector action: target url "http://servicenow.mynonexistent.com" is not whitelisted in the Kibana config xpack.actions.whitelistedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a servicenow action without secrets', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              incidentConfiguration: mockServiceNow.config.incidentConfiguration,
              isCaseOwned: true,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [password]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should create a servicenow action without incidentConfiguration', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(200);
      });

      it('should respond with a 400 Bad Request when creating a servicenow action with empty mapping', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              incidentConfiguration: { mapping: [] },
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [incidentConfiguration.mapping]: expected non-empty but got empty',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a servicenow action with wrong actionType', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              incidentConfiguration: {
                mapping: [
                  {
                    source: 'title',
                    target: 'description',
                    actionType: 'non-supported',
                  },
                ],
              },
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(400);
      });
    });

    describe('ServiceNow - Executor', () => {
      let simulatedActionId: string;
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow simulator',
            actionTypeId: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
              incidentConfiguration: mockServiceNow.config.incidentConfiguration,
              isCaseOwned: true,
            },
            secrets: mockServiceNow.secrets,
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
                ...mockServiceNow.params,
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

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  ...mockServiceNow.params.subActionParams,
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.comments.0.commentId]: expected value of type [string] but got [undefined]',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  ...mockServiceNow.params.subActionParams,
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getIncident]\n- [1.subAction]: expected value to equal [handshake]\n- [2.subActionParams.comments.0.comment]: expected value of type [string] but got [undefined]',
              });
            });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident without comments', async () => {
          const { body: result } = await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  ...mockServiceNow.params.subActionParams,
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(result).to.eql({
            status: 'ok',
            actionId: simulatedActionId,
            data: {
              id: '123',
              title: 'INC01',
              pushedDate: '2020-03-10T12:24:20.000Z',
              url: `${servicenowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
            },
          });
        });
      });
    });
  });
}
