/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';

import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function servicenowTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  const mockServiceNow = {
    config: {
      apiUrl: 'www.servicenowisinkibanaactions.com',
    },
    secrets: {
      password: 'elastic',
      username: 'changeme',
    },
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
          subcategory: 'software',
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
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
            },
            secrets: mockServiceNow.secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: servicenowSimulatorURL,
          },
        });

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          name: 'A servicenow action',
          connector_type_id: '.servicenow',
          is_missing_secrets: false,
          config: {
            apiUrl: servicenowSimulatorURL,
          },
        });
      });

      it('should respond with a 400 Bad Request when creating a servicenow action with no apiUrl', async () => {
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

      it('should respond with a 400 Bad Request when creating a servicenow action with a not present in allowedHosts apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: 'http://servicenow.mynonexistent.com',
            },
            secrets: mockServiceNow.secrets,
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

      it('should respond with a 400 Bad Request when creating a servicenow action without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow action',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
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
    });

    describe('ServiceNow - Executor', () => {
      let simulatedActionId: string;
      let proxyServer: httpProxy | undefined;
      let proxyHaveBeenCalled = false;
      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A servicenow simulator',
            connector_type_id: '.servicenow',
            config: {
              apiUrl: servicenowSimulatorURL,
            },
            secrets: mockServiceNow.secrets,
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
              expect(Object.keys(resp.body)).to.eql(['status', 'message', 'retry', 'connector_id']);
              expect(resp.body.connector_id).to.eql(simulatedActionId);
              expect(resp.body.status).to.eql('error');
              expect(resp.body.retry).to.eql(false);
              // Node.js 12 oddity:
              //
              // The first time after the server is booted, the error message will be:
              //
              //     undefined is not iterable (cannot read property Symbol(Symbol.iterator))
              //
              // After this, the error will be:
              //
              //     Cannot destructure property 'value' of 'undefined' as it is undefined.
              //
              // The error seems to come from the exact same place in the code based on the
              // exact same circumstances:
              //
              //     https://github.com/elastic/kibana/blob/b0a223ebcbac7e404e8ae6da23b2cc6a4b509ff1/packages/kbn-config-schema/src/types/literal_type.ts#L28
              //
              // What triggers the error is that the `handleError` function expects its 2nd
              // argument to be an object containing a `valids` property of type array.
              //
              // In this test the object does not contain a `valids` property, so hence the
              // error.
              //
              // Why the error message isn't the same in all scenarios is unknown to me and
              // could be a bug in V8.
              expect(resp.body.message).to.match(
                /^error validating action params: (undefined is not iterable \(cannot read property Symbol\(Symbol.iterator\)\)|Cannot destructure property 'value' of 'undefined' as it is undefined\.)$/
              );
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subAction]: expected value to equal [getChoices]',
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
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.short_description]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [getChoices]',
              });
            });
        });

        it('should handle failing with a simulated success without title', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
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
                connector_id: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.short_description]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [getChoices]',
              });
            });
        });

        it('should handle failing with a simulated success without commentId', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  incident: {
                    ...mockServiceNow.params.subActionParams.incident,
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
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [getChoices]',
              });
            });
        });

        it('should handle failing with a simulated success without comment message', async () => {
          await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  incident: {
                    ...mockServiceNow.params.subActionParams.incident,
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
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [getChoices]',
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
                  message:
                    'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subActionParams.fields]: expected value of type [array] but got [undefined]',
                });
              });
          });
        });
      });

      describe('Execution', () => {
        it('should handle creating an incident without comments', async () => {
          const { body: result } = await supertest
            .post(`/api/actions/connector/${simulatedActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                ...mockServiceNow.params,
                subActionParams: {
                  incident: mockServiceNow.params.subActionParams.incident,
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
              url: `${servicenowSimulatorURL}/nav_to.do?uri=incident.do?sys_id=123`,
            },
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
      });

      after(() => {
        if (proxyServer) {
          proxyServer.close();
        }
      });
    });
  });
}
