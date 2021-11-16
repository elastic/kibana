/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import getPort from 'get-port';
import http from 'http';

import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getSwimlaneServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function swimlaneTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const mockSwimlane = {
    name: 'A swimlane action',
    actionTypeId: '.swimlane',
    config: {
      apiUrl: 'http://swimlane.mynonexistent.com',
      appId: '123456asdf',
      connectorType: 'all' as const,
      mappings: {
        alertIdConfig: {
          id: 'ednjls',
          name: 'Alert id',
          key: 'alert-id',
          fieldType: 'text',
        },
        severityConfig: {
          id: 'adnlas',
          name: 'Severity',
          key: 'severity',
          fieldType: 'text',
        },
        ruleNameConfig: {
          id: 'adnfls',
          name: 'Rule Name',
          key: 'rule-name',
          fieldType: 'text',
        },
        caseIdConfig: {
          id: 'a6sst',
          name: 'Case Id',
          key: 'case-id-name',
          fieldType: 'text',
        },
        caseNameConfig: {
          id: 'a6fst',
          name: 'Case Name',
          key: 'case-name',
          fieldType: 'text',
        },
        commentsConfig: {
          id: 'a6fdf',
          name: 'Comments',
          key: 'comments',
          fieldType: 'notes',
        },
        descriptionConfig: {
          id: 'a6fdf',
          name: 'Description',
          key: 'description',
          fieldType: 'text',
        },
      },
    },
    secrets: {
      apiToken: 'swimlane-api-key',
    },
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          alertId: 'fs345f78g',
          ruleName: 'Rule Name',
          severity: 'Critical',
          caseName: 'Case Name',
          caseId: 'es3456789',
          description: 'This is a description',
          externalId: null,
        },
        comments: [
          {
            comment: 'first comment',
            commentId: '123',
          },
        ],
      },
    },
  };

  describe('Swimlane', () => {
    let simulatedActionId = '';
    let swimlaneSimulatorURL: string = '';
    let swimlaneServer: http.Server;
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    before(async () => {
      swimlaneServer = await getSwimlaneServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!swimlaneServer.listening) {
        swimlaneServer.listen(availablePort);
      }
      swimlaneSimulatorURL = `http://localhost:${availablePort}`;
      proxyServer = await getHttpProxyServer(
        swimlaneSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    after(() => {
      swimlaneServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    describe('Swimlane - Action Creation', () => {
      it('should return 200 when creating a swimlane action successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          config: {
            ...mockSwimlane.config,
            apiUrl: swimlaneSimulatorURL,
          },
          connector_type_id: '.swimlane',
          id: createdAction.id,
          is_missing_secrets: false,
          is_preconfigured: false,
          name: 'A swimlane action',
        });

        expect(typeof createdAction.id).to.be('string');

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_missing_secrets: false,
          name: 'A swimlane action',
          connector_type_id: '.swimlane',
          config: {
            ...mockSwimlane.config,
            apiUrl: swimlaneSimulatorURL,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a swimlane action with no apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              connectorType: 'all' as const,
              appId: mockSwimlane.config.appId,
              mappings: mockSwimlane.config.mappings,
            },
            secrets: mockSwimlane.secrets,
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

      it('should respond with a 400 Bad Request when creating a swimlane action with no appId', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              connectorType: 'all' as const,
              mappings: mockSwimlane.config.mappings,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [appId]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a swimlane action without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: {},
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [apiToken]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request default swimlane url is not present in allowedHosts', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: mockSwimlane.config,
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type config: error configuring connector action: target url "${mockSwimlane.config.apiUrl}" is not added to the Kibana config xpack.actions.allowedHosts`,
            });
          });
      });

      it('should respond with a 400 Bad Request if connectorType is not supported', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane action',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
              connectorType: 'not-supported',
            },
            secrets: mockSwimlane.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [connectorType]: types that failed validation:\n- [connectorType.0]: expected value to equal [all]\n- [connectorType.1]: expected value to equal [alerts]\n- [connectorType.2]: expected value to equal [cases]',
            });
          });
      });
    });

    describe('Swimlane - Executor', () => {
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A swimlane simulator',
            connector_type_id: '.swimlane',
            config: {
              ...mockSwimlane.config,
              apiUrl: swimlaneSimulatorURL,
            },
            secrets: mockSwimlane.secrets,
          });
        simulatedActionId = body.id;
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
              expect(Object.keys(resp.body)).to.eql(['status', 'message', 'retry', 'connector_id']);
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
              });
            });
        });

        /**
         * All subActionParams are optional.
         * If subActionParams is not provided all
         * the subActionParams attributes will be set to null
         * and the validation will succeed. For that reason,
         * the subActionParams need to be set to null.
         */
        it('should handle failing with a simulated success without subActionParams', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'pushToService', subActionParams: null },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: [subActionParams]: expected a plain object value, but found [null] instead.',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
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
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
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
              });
            });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  ...mockSwimlane.params.subActionParams,
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          expect(body).to.eql({
            status: 'ok',
            connector_id: simulatedActionId,
            data: {
              id: 'wowzeronza',
              title: 'ET-69',
              pushedDate: '2021-06-01T17:29:51.092Z',
              url: `${swimlaneSimulatorURL}/record/123456asdf/wowzeronza`,
            },
          });
        });

        it('should handle updating an incident', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockSwimlane.params,
                subActionParams: {
                  incident: {
                    ...mockSwimlane.params.subActionParams.incident,
                    externalId: 'wowzeronza',
                  },
                  comments: [],
                },
              },
            })
            .expect(200);

          expect(proxyHaveBeenCalled).to.equal(true);
          expect(body).to.eql({
            status: 'ok',
            connector_id: simulatedActionId,
            data: {
              id: 'wowzeronza',
              title: 'ET-69',
              pushedDate: '2021-06-01T17:29:51.092Z',
              url: `${swimlaneSimulatorURL}/record/123456asdf/wowzeronza`,
            },
          });
        });
      });
    });
  });
}
