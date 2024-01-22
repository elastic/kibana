/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import { asyncForEach } from '@kbn/std';
import getPort from 'get-port';
import http from 'http';

import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import { getServiceNowServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function serviceNowITSMTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  const mockServiceNowCommon = {
    params: {
      subAction: 'pushToService',
      subActionParams: {
        incident: {
          description: 'a description',
          externalId: null,
          impact: '1',
          severity: '1',
          short_description: 'a title',
          urgency: '1',
          category: 'software',
          subcategory: 'os',
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

  const mockServiceNowBasic = {
    ...mockServiceNowCommon,
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
      usesTableApi: false,
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
  };
  const mockServiceNowOAuth = {
    ...mockServiceNowCommon,
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
      usesTableApi: false,
      isOAuth: true,
      clientId: 'abc',
      userIdentifierValue: 'elastic',
      jwtKeyId: 'def',
    },
    secrets: {
      clientSecret: 'xyz',
      privateKey: '-----BEGIN RSA PRIVATE KEY-----\nddddddd\n-----END RSA PRIVATE KEY-----',
    },
  };

  describe('ServiceNow ITSM', () => {
    let simulatedActionId = '';
    let serviceNowSimulatorURL: string = '';
    let serviceNowServer: http.Server;
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    before(async () => {
      serviceNowServer = await getServiceNowServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!serviceNowServer.listening) {
        serviceNowServer.listen(availablePort);
      }
      serviceNowSimulatorURL = `http://localhost:${availablePort}`;
      proxyServer = await getHttpProxyServer(
        serviceNowSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    after(() => {
      serviceNowServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    describe('ServiceNow ITSM - Action Creation', () => {
      it('should return 200 when creating a servicenow Basic Auth connector successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: serviceNowSimulatorURL,
              usesTableApi: false,
            },
            secrets: mockServiceNowBasic.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: serviceNowSimulatorURL,
            usesTableApi: false,
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
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
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: serviceNowSimulatorURL,
            usesTableApi: false,
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
          },
        });
      });

      it('should return 200 when creating a servicenow OAuth connector successfully', async () => {
        const { body: createdConnector } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
            },
            secrets: mockServiceNowOAuth.secrets,
          })
          .expect(200);

        expect(createdConnector).to.eql({
          id: createdConnector.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: serviceNowSimulatorURL,
            usesTableApi: false,
            isOAuth: true,
            clientId: mockServiceNowOAuth.config.clientId,
            jwtKeyId: mockServiceNowOAuth.config.jwtKeyId,
            userIdentifierValue: mockServiceNowOAuth.config.userIdentifierValue,
          },
        });

        const { body: fetchedConnector } = await supertest
          .get(`/api/actions/connector/${createdConnector.id}`)
          .expect(200);

        expect(fetchedConnector).to.eql({
          id: fetchedConnector.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: serviceNowSimulatorURL,
            usesTableApi: false,
            isOAuth: true,
            clientId: mockServiceNowOAuth.config.clientId,
            jwtKeyId: mockServiceNowOAuth.config.jwtKeyId,
            userIdentifierValue: mockServiceNowOAuth.config.userIdentifierValue,
          },
        });
      });

      it('should set the usesTableApi to true when not provided', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: serviceNowSimulatorURL,
            },
            secrets: mockServiceNowBasic.secrets,
          })
          .expect(200);

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction.config.usesTableApi).to.be(true);
      });

      it('should respond with a 400 Bad Request when creating a servicenow Basic Auth connector with no apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
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

      it('should respond with a 400 Bad Request when creating a servicenow OAuth connector with no apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              isOAuth: true,
            },
            secrets: mockServiceNowOAuth.secrets,
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

      it('should respond with a 400 Bad Request when creating a servicenow connector with a not present in allowedHosts apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: 'http://servicenow.mynonexistent.com',
            },
            secrets: mockServiceNowBasic.secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error configuring connector action: target url "http://servicenow.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a servicenow Basic Auth connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: serviceNowSimulatorURL,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: Either basic auth or OAuth credentials must be specified',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a servicenow OAuth connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: Either basic auth or OAuth credentials must be specified',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a servicenow OAuth connector with missing fields', async () => {
        const badConfigs = [
          {
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
              clientId: null,
            },
            secrets: mockServiceNowOAuth.secrets,
            errorMessage: `error validating action type config: clientId must be provided when isOAuth = true`,
          },
          {
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
              userIdentifierValue: null,
            },
            secrets: mockServiceNowOAuth.secrets,
            errorMessage: `error validating action type config: userIdentifierValue must be provided when isOAuth = true`,
          },
          {
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
              jwtKeyId: null,
            },
            secrets: mockServiceNowOAuth.secrets,
            errorMessage: `error validating action type config: jwtKeyId must be provided when isOAuth = true`,
          },
          {
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
            },
            secrets: {
              ...mockServiceNowOAuth.secrets,
              clientSecret: null,
            },
            errorMessage: `error validating action type secrets: clientSecret and privateKey must both be specified`,
          },
          {
            config: {
              ...mockServiceNowOAuth.config,
              apiUrl: serviceNowSimulatorURL,
            },
            secrets: {
              ...mockServiceNowOAuth.secrets,
              privateKey: null,
            },
            errorMessage: `error validating action type secrets: clientSecret and privateKey must both be specified`,
          },
        ];

        await asyncForEach(badConfigs, async (badConfig) => {
          await supertest
            .post('/api/actions/connector')
            .set('kbn-xsrf', 'foo')
            .send({
              name: 'A servicenow action',
              connector_type_id: '.servicenow',
              config: badConfig.config,
              secrets: badConfig.secrets,
            })
            .expect(400)
            .then((resp: any) => {
              expect(resp.body).to.eql({
                statusCode: 400,
                error: 'Bad Request',
                message: badConfig.errorMessage,
              });
            });
        });
      });
    });

    describe('ServiceNow ITSM - Executor', () => {
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow simulator',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: serviceNowSimulatorURL,
              usesTableApi: false,
            },
            secrets: mockServiceNowBasic.secrets,
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
                errorSource: TaskErrorSource.FRAMEWORK,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subAction]: expected value to equal [getChoices]\n- [5.subAction]: expected value to equal [closeIncident]',
              });
            });
        });

        it('should handle failing with a simulated success without subActionParams', async () => {
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
                errorSource: TaskErrorSource.FRAMEWORK,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.short_description]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [getChoices]\n- [5.subAction]: expected value to equal [closeIncident]',
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNowBasic.params,
                subActionParams: {
                  savedObjectId: 'success',
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                errorSource: TaskErrorSource.FRAMEWORK,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.short_description]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [getChoices]\n- [5.subAction]: expected value to equal [closeIncident]',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNowBasic.params,
                subActionParams: {
                  incident: {
                    ...mockServiceNowBasic.params.subActionParams.incident,
                    short_description: 'success',
                  },
                  comments: [{ comment: 'boo' }],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                errorSource: TaskErrorSource.FRAMEWORK,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [getChoices]\n- [5.subAction]: expected value to equal [closeIncident]',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNowBasic.params,
                subActionParams: {
                  incident: {
                    ...mockServiceNowBasic.params.subActionParams.incident,
                    short_description: 'success',
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
                errorSource: TaskErrorSource.FRAMEWORK,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [getChoices]\n- [5.subAction]: expected value to equal [closeIncident]',
              });
            });
        });

        describe('getChoices', () => {
          it('should fail when field is not provided', async () => {
            await supertest
              .post(`/api/actions/connector/${simulatedActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'getChoices',
                  subActionParams: {},
                },
              })
              .then((resp: any) => {
                expect(resp.body).to.eql({
                  connector_id: simulatedActionId,
                  status: 'error',
                  retry: false,
                  errorSource: TaskErrorSource.FRAMEWORK,
                  message:
                    'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subActionParams.fields]: expected value of type [array] but got [undefined]\n- [5.subAction]: expected value to equal [closeIncident]',
                });
              });
          });
        });
      });

      describe('Execution', () => {
        // Connectors that use the Import set API
        describe('Import set API', () => {
          it('should handle creating an incident without comments', async () => {
            const { body: result } = await supertest
              .post(`/api/actions/connector/${simulatedActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  ...mockServiceNowBasic.params,
                  subActionParams: {
                    incident: mockServiceNowBasic.params.subActionParams.incident,
                    comments: [],
                  },
                },
              })
              .expect(200);

            expect(proxyHaveBeenCalled).to.equal(true);
            expect(result).to.eql({
              status: 'ok',
              connector_id: simulatedActionId,
              data: {
                id: '123',
                title: 'INC01',
                pushedDate: '2020-03-10T12:24:20.000Z',
                url: `${serviceNowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
              },
            });
          });
        });

        // Connectors that use the Table API
        describe('Table API', () => {
          before(async () => {
            const { body } = await supertest
              .post('/api/actions/connector')
              .set('kbn-xsrf', 'foo')
              .send({
                name: 'A servicenow simulator',
                connector_type_id: '.servicenow',
                config: {
                  apiUrl: serviceNowSimulatorURL,
                  usesTableApi: true,
                },
                secrets: mockServiceNowBasic.secrets,
              });
            simulatedActionId = body.id;
          });

          it('should handle creating an incident without comments', async () => {
            const { body: result } = await supertest
              .post(`/api/actions/connector/${simulatedActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  ...mockServiceNowBasic.params,
                  subActionParams: {
                    incident: mockServiceNowBasic.params.subActionParams.incident,
                    comments: [],
                  },
                },
              })
              .expect(200);

            expect(proxyHaveBeenCalled).to.equal(true);
            expect(result).to.eql({
              status: 'ok',
              connector_id: simulatedActionId,
              data: {
                id: '123',
                title: 'INC01',
                pushedDate: '2020-03-10T12:24:20.000Z',
                url: `${serviceNowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
              },
            });
          });
        });

        describe('getChoices', () => {
          it('should get choices', async () => {
            const { body: result } = await supertest
              .post(`/api/actions/connector/${simulatedActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'getChoices',
                  subActionParams: { fields: ['priority'] },
                },
              })
              .expect(200);

            expect(proxyHaveBeenCalled).to.equal(true);
            expect(result).to.eql({
              status: 'ok',
              connector_id: simulatedActionId,
              data: [
                {
                  dependent_value: '',
                  label: '1 - Critical',
                  value: '1',
                },
                {
                  dependent_value: '',
                  label: '2 - High',
                  value: '2',
                },
                {
                  dependent_value: '',
                  label: '3 - Moderate',
                  value: '3',
                },
                {
                  dependent_value: '',
                  label: '4 - Low',
                  value: '4',
                },
                {
                  dependent_value: '',
                  label: '5 - Planning',
                  value: '5',
                },
              ],
            });
          });
        });

        describe('closeIncident', () => {
          it('should close the incident', async () => {
            const { body: result } = await supertest
              .post(`/api/actions/connector/${simulatedActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeIncident',
                  subActionParams: {
                    incident: {
                      correlation_id: 'custom_correlation_id',
                    },
                  },
                },
              })
              .expect(200);

            expect(proxyHaveBeenCalled).to.equal(true);
            expect(result).to.eql({
              status: 'ok',
              connector_id: simulatedActionId,
              data: {},
            });
          });
        });
      });
    });
  });
}
