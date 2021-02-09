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
export default function resilientTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
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

      it('should respond with a 400 Bad Request when creating a ibm resilient action with a not present in allowedHosts apiUrl', async () => {
        await supertest
          .post('/api/actions/action')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An IBM Resilient',
            actionTypeId: '.resilient',
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
                'error validating action type config: error configuring connector action: target url "http://resilient.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
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
      let simulatedActionId: string;
      let proxyServer: httpProxy | undefined;
      let proxyHaveBeenCalled = false;
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
            },
            secrets: mockResilient.secrets,
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
              expect(Object.keys(resp.body)).to.eql(['status', 'actionId', 'message', 'retry']);
              expect(resp.body.actionId).to.eql(simulatedActionId);
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
              // exact same circomstances:
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subAction]: expected value to equal [pushToService]\n- [4.subAction]: expected value to equal [incidentTypes]\n- [5.subAction]: expected value to equal [severity]',
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
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.name]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [incidentTypes]\n- [5.subAction]: expected value to equal [severity]',
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
                  incident: {
                    description: 'success',
                  },
                  comments: [],
                },
              },
            })
            .then((resp: any) => {
              expect(resp.body).to.eql({
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.incident.name]: expected value of type [string] but got [undefined]\n- [4.subAction]: expected value to equal [incidentTypes]\n- [5.subAction]: expected value to equal [severity]',
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
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.commentId]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [incidentTypes]\n- [5.subAction]: expected value to equal [severity]',
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
                actionId: simulatedActionId,
                status: 'error',
                retry: false,
                message:
                  'error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getFields]\n- [1.subAction]: expected value to equal [getIncident]\n- [2.subAction]: expected value to equal [handshake]\n- [3.subActionParams.comments]: types that failed validation:\n - [subActionParams.comments.0.0.comment]: expected value of type [string] but got [undefined]\n - [subActionParams.comments.1]: expected value to equal [null]\n- [4.subAction]: expected value to equal [incidentTypes]\n- [5.subAction]: expected value to equal [severity]',
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
                  comments: null,
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
              title: '123',
              pushedDate: '2020-05-13T17:44:34.472Z',
              url: `${resilientSimulatorURL}/#incidents/123`,
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
