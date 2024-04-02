/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '@kbn/actions-simulators-plugin/server/plugin';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function casesWebhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');
  const config = {
    createCommentJson: '{"body":{{{case.comment}}}}',
    createCommentMethod: 'post',
    createCommentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}/comment',
    createIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    createIncidentMethod: 'post',
    createIncidentResponseKey: 'id',
    createIncidentUrl: 'https://coolsite.net/rest/api/2/issue',
    getIncidentResponseExternalTitleKey: 'key',
    hasAuth: true,
    headers: { ['content-type']: 'application/json', ['kbn-xsrf']: 'abcd' },
    viewIncidentUrl: 'https://coolsite.net/browse/{{{external.system.title}}}',
    getIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
    updateIncidentJson:
      '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}}',
    updateIncidentMethod: 'put',
    updateIncidentUrl: 'https://coolsite.net/rest/api/2/issue/{{{external.system.id}}}',
  };
  const requiredFields = [
    'createIncidentJson',
    'createIncidentResponseKey',
    'createIncidentUrl',
    'getIncidentResponseExternalTitleKey',
    'viewIncidentUrl',
    'getIncidentUrl',
    'updateIncidentJson',
    'updateIncidentUrl',
  ];
  const secrets = {
    user: 'user',
    password: 'pass',
  };
  const mockCasesWebhook = {
    config,
    secrets,
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          title: 'a title',
          description: 'a description',
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

  let casesWebhookSimulatorURL: string = '<could not determine kibana url>';
  let simulatorConfig: Record<string, string | boolean | Record<string, string>>;
  describe('CasesWebhook', () => {
    before(() => {
      // use jira because cases webhook works with any third party case management system
      casesWebhookSimulatorURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.JIRA)
      );

      simulatorConfig = {
        ...mockCasesWebhook.config,
        createCommentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue/{{{external.system.id}}}/comment`,
        createIncidentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue`,
        viewIncidentUrl: `${casesWebhookSimulatorURL}/browse/{{{external.system.title}}}`,
        getIncidentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue/{{{external.system.id}}}`,
        updateIncidentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue/{{{external.system.id}}}`,
      };
    });
    describe('CasesWebhook - Action Creation', () => {
      it('should return 200 when creating a casesWebhook action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A casesWebhook action',
            connector_type_id: '.cases-webhook',
            config: simulatorConfig,
            secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A casesWebhook action',
          connector_type_id: '.cases-webhook',
          is_missing_secrets: false,
          config: simulatorConfig,
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A casesWebhook action',
          connector_type_id: '.cases-webhook',
          is_missing_secrets: false,
          config: simulatorConfig,
        });
      });
      describe('400s for all required fields when missing', () => {
        requiredFields.forEach((field) => {
          it(`should respond with a 400 Bad Request when creating a casesWebhook action with no ${field}`, async () => {
            const incompleteConfig = { ...simulatorConfig };
            delete incompleteConfig[field];
            await supertest
              .post('/api/actions/connector')
              .set('kbn-xsrf', 'foo')
              .send({
                name: 'A casesWebhook action',
                connector_type_id: '.cases-webhook',
                config: incompleteConfig,
                secrets,
              })
              .expect(400)
              .then((resp: any) => {
                expect(resp.body).to.eql({
                  statusCode: 400,
                  error: 'Bad Request',
                  message: `error validating action type config: [${field}]: expected value of type [string] but got [undefined]`,
                });
              });
          });
        });
      });

      it('should respond with a 400 Bad Request when creating a casesWebhook action with a not present in allowedHosts apiUrl', async () => {
        const badUrl = 'http://casesWebhook.mynonexistent.com';
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A casesWebhook action',
            connector_type_id: '.cases-webhook',
            config: {
              ...mockCasesWebhook.config,
              createCommentUrl: `${badUrl}/{{{external.system.id}}}/comments`,
              createIncidentUrl: badUrl,
              viewIncidentUrl: `${badUrl}/{{{external.system.title}}}`,
              getIncidentUrl: `${badUrl}/{{{external.system.id}}}`,
              updateIncidentUrl: `${badUrl}/{{{external.system.id}}}`,
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring cases webhook action: target url "http://casesWebhook.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a casesWebhook action without secrets when hasAuth = true', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A casesWebhook action',
            connector_type_id: '.cases-webhook',
            config: simulatorConfig,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type connector: both user and password must be specified',
            });
          });
      });
    });

    describe('CasesWebhook - Executor', () => {
      let simulatedActionId: string;
      let proxyServer: httpProxy | undefined;
      let proxyHaveBeenCalled = false;

      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A casesWebhook simulator',
            connector_type_id: '.cases-webhook',
            config: simulatorConfig,
            secrets,
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
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
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
              expect(resp.body.connector_id).to.eql(simulatedActionId);
              expect(resp.body.status).to.eql('error');
            });
        });

        it('should handle failing with a simulated success without unsupported action', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'non-supported' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subAction]: expected value to equal [pushToService]',
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });

        it('should handle failing with a simulated success without subActionParams argument', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService' },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.incident.title]: expected value of type [string] but got [undefined]',
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
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
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.incident.title]: expected value of type [string] but got [undefined]',
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    ...mockCasesWebhook.params.subActionParams.incident,
                    description: 'success',
                    title: 'success',
                  },
                  comments: [{ comment: 'comment' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.comments]: types that failed validation:\n- [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n- [subActionParams.comments.1]: expected value to equal [null]',
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    ...mockCasesWebhook.params.subActionParams.incident,
                    title: 'success',
                  },
                  comments: [{ commentId: 'success' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams.comments]: types that failed validation:\n- [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n- [subActionParams.comments.1]: expected value to equal [null]',
                errorSource: TaskErrorSource.FRAMEWORK,
              });
            });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident without comments', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: mockCasesWebhook.params.subActionParams.incident,
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          const { pushedDate, ...dataWithoutTime } = body.data;
          body.data = dataWithoutTime;

          expect(body).to.eql({
            status: 'ok',
            connector_id: simulatedActionId,
            data: {
              id: '123',
              title: 'CK-1',
              url: `${casesWebhookSimulatorURL}/browse/CK-1`,
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

    describe('CasesWebhook - Executor bad data', () => {
      describe('bad case JSON', () => {
        let simulatedActionId: string;
        let proxyServer: httpProxy | undefined;
        let proxyHaveBeenCalled = false;
        const jsonExtraCommas =
          '{"fields":{"summary":{{{case.title}}},"description":{{{case.description}}},"labels":{{{case.tags}}},"project":{"key":"ROC"},"issuetype":{"id":"10024"}}},,,,,';
        before(async () => {
          const { body } = await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'A casesWebhook simulator',
              connector_type_id: '.cases-webhook',
              config: {
                ...simulatorConfig,
                createIncidentJson: jsonExtraCommas,
                updateIncidentJson: jsonExtraCommas,
              },
              secrets,
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

        it('should respond with bad JSON error when create case JSON is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to create case. Error: JSON Error: Create case JSON body must be valid JSON.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(false);
        });

        it('should respond with bad JSON error when update case JSON is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                    externalId: '12345',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to update case with id 12345. Error: JSON Error: Update case JSON body must be valid JSON.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(false);
        });
        after(() => {
          if (proxyServer) {
            proxyServer.close();
          }
        });
      });
      describe('bad comment JSON', () => {
        let simulatedActionId: string;
        let proxyServer: httpProxy | undefined;
        let proxyHaveBeenCalled = false;
        before(async () => {
          const { body } = await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'A casesWebhook simulator',
              connector_type_id: '.cases-webhook',
              config: {
                ...simulatorConfig,
                createCommentJson: '{"body":{{{case.comment}}}},,,,,,,',
              },
              secrets,
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

        it('should respond with bad JSON error when create case comment JSON is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                  },
                  comments: [
                    {
                      comment: 'first comment',
                      commentId: '456',
                    },
                  ],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to create comment at case with id 123. Error: JSON Error: Create comment JSON body must be valid JSON.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(true); // called for the create case successful call
        });

        after(() => {
          if (proxyServer) {
            proxyServer.close();
          }
        });
      });
    });

    describe('CasesWebhook - Executor bad URLs', () => {
      describe('bad case URL', () => {
        let simulatedActionId: string;
        let proxyServer: httpProxy | undefined;
        let proxyHaveBeenCalled = false;
        before(async () => {
          const { body } = await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'A casesWebhook simulator',
              connector_type_id: '.cases-webhook',
              config: {
                ...simulatorConfig,
                createIncidentUrl: `https${casesWebhookSimulatorURL}`,
                updateIncidentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue/{{{external.system.id}}}e\\\\whoathisisbad4{}\{\{`,
              },
              secrets,
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

        it('should respond with bad URL error when create case URL is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to create case. Error: Invalid Create case URL: Error: Invalid protocol.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(false);
        });

        it('should respond with bad URL error when update case URL is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                    externalId: '12345',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to update case with id 12345. Error: Invalid Update case URL: Error: Invalid URL.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(false);
        });
        after(() => {
          if (proxyServer) {
            proxyServer.close();
          }
        });
      });
      describe('bad comment URL', () => {
        let simulatedActionId: string;
        let proxyServer: httpProxy | undefined;
        let proxyHaveBeenCalled = false;
        before(async () => {
          const { body } = await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'A casesWebhook simulator',
              connector_type_id: '.cases-webhook',
              config: {
                ...simulatorConfig,
                createCommentUrl: `${casesWebhookSimulatorURL}/rest/api/2/issue/{{{external.system.id}}}e\\\\whoathisisbad4{}\{\{`,
              },
              secrets,
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

        it('should respond with bad URL error when create case comment URL is bad', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockCasesWebhook.params,
                subActionParams: {
                  incident: {
                    title: 'success',
                    description: 'success',
                  },
                  comments: [
                    {
                      comment: 'first comment',
                      commentId: '456',
                    },
                  ],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                errorSource: TaskErrorSource.FRAMEWORK,
                service_message:
                  '[Action][Webhook - Case Management]: Unable to create comment at case with id 123. Error: Invalid Create comment URL: Error: Invalid URL.  ',
              });
            });
          expect(proxyHaveBeenCalled).to.equal(true); // called for the create case successful call
        });

        after(() => {
          if (proxyServer) {
            proxyServer.close();
          }
        });
      });
    });
  });
}
