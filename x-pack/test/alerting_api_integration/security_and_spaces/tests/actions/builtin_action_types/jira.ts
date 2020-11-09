/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

const mapping = [
  {
    source: 'title',
    target: 'summary',
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
export default function jiraTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  const mockJira = {
    config: {
      apiUrl: 'www.jiraisinkibanaactions.com',
      projectKey: 'CK',
      incidentConfiguration: { mapping },
    },
    secrets: {
      apiToken: 'elastic',
      email: 'elastic@elastic.co',
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

  let jiraSimulatorURL: string = '<could not determine kibana url>';

  describe('Jira', () => {
    before(() => {
      jiraSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA)
      );
    });
    describe('Jira - Action Creation', () => {
      it('should return 200 when creating a jira action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: {
              ...mockJira.config,
              apiUrl: jiraSimulatorURL,
              incidentConfiguration: mockJira.config.incidentConfiguration,
              isCaseOwned: true,
            },
            secrets: mockJira.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          isPreconfigured: false,
          name: 'A jira action',
          actionTypeId: '.jira',
          config: {
            apiUrl: jiraSimulatorURL,
            projectKey: mockJira.config.projectKey,
            incidentConfiguration: mockJira.config.incidentConfiguration,
            isCaseOwned: true,
          },
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/action/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          isPreconfigured: false,
          name: 'A jira action',
          actionTypeId: '.jira',
          config: {
            apiUrl: jiraSimulatorURL,
            projectKey: mockJira.config.projectKey,
            incidentConfiguration: mockJira.config.incidentConfiguration,
            isCaseOwned: true,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a jira action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: { projectKey: 'CK' },
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

      it('should respond with a 400 Bad Request when creating a jira action with no projectKey', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: { apiUrl: jiraSimulatorURL },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [projectKey]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a jira action with a not present in allowedHosts apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: {
              apiUrl: 'http://jira.mynonexistent.com',
              projectKey: mockJira.config.projectKey,
              incidentConfiguration: mockJira.config.incidentConfiguration,
            },
            secrets: mockJira.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring connector action: target url "http://jira.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a jira action without secrets', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: {
              apiUrl: jiraSimulatorURL,
              projectKey: mockJira.config.projectKey,
              incidentConfiguration: mockJira.config.incidentConfiguration,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [email]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a jira action with empty mapping', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: {
              apiUrl: jiraSimulatorURL,
              projectKey: mockJira.config.projectKey,
              incidentConfiguration: { mapping: [] },
            },
            secrets: mockJira.secrets,
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

      it('should respond with a 400 Bad Request when creating a jira action with wrong actionType', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira action',
            actionTypeId: '.jira',
            config: {
              apiUrl: jiraSimulatorURL,
              projectKey: mockJira.config.projectKey,
              incidentConfiguration: {
                mapping: [
                  {
                    source: 'title',
                    target: 'description',
                    actionType: 'non-supported',
                  },
                ],
              },
            },
            secrets: mockJira.secrets,
          })
          .expect(400);
      });
    });

    describe('Jira - Executor', () => {
      let simulatedActionId: string;
      let proxyServer: httpProxy | undefined;
      let proxyHaveBeenCalled = false;

      before(async () => {
        const { body } = await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A jira simulator',
            actionTypeId: '.jira',
            config: {
              apiUrl: jiraSimulatorURL,
              projectKey: mockJira.config.projectKey,
              incidentConfiguration: mockJira.config.incidentConfiguration,
            },
            secrets: mockJira.secrets,
          });
        simulatedActionId = body.id;

        proxyServer = await getHttpProxyServer(
          kibanaServer.resolveUrl('/'),
          configService.get('kbnTestServer.serverArgs'),
          () => {
            proxyHaveBeenCalled = true;
          }
        );
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subAction]: expected value to equal [issueTypes]\n- [5.subAction]: expected value to equal [fieldsByIssueType]\n- [6.subAction]: expected value to equal [issues]\n- [7.subAction]: expected value to equal [issue]',
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.title]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [issueTypes]\n- [5.subAction]: expected value to equal [fieldsByIssueType]\n- [6.subAction]: expected value to equal [issues]\n- [7.subAction]: expected value to equal [issue]',
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockJira.params,
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.title]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [issueTypes]\n- [5.subAction]: expected value to equal [fieldsByIssueType]\n- [6.subAction]: expected value to equal [issues]\n- [7.subAction]: expected value to equal [issue]',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockJira.params,
                subActionParams: {
                  ...mockJira.params.subActionParams,
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [issueTypes]\n- [5.subAction]: expected value to equal [fieldsByIssueType]\n- [6.subAction]: expected value to equal [issues]\n- [7.subAction]: expected value to equal [issue]',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/action/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockJira.params,
                subActionParams: {
                  ...mockJira.params.subActionParams,
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [issueTypes]\n- [5.subAction]: expected value to equal [fieldsByIssueType]\n- [6.subAction]: expected value to equal [issues]\n- [7.subAction]: expected value to equal [issue]',
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
                ...mockJira.params,
                subActionParams: {
                  ...mockJira.params.subActionParams,
                  comments: [],
                  issueType: '10006',
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          expect(body).to.eql({
            status: 'ok',
            actionId: simulatedActionId,
            data: {
              id: '123',
              title: 'CK-1',
              pushedDate: '2020-04-27T14:17:45.490Z',
              url: `${jiraSimulatorURL}/browse/CK-1`,
            },
          });
        });
      });

      after(() => {
        if (proxyServer) {
          proxyServer.close();
        }
      });
    });
  });
}
