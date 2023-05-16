/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  GenAiSimulator,
  genAiSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/gen_ai_simulation';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function genAiTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  describe('GenAi', () => {
    describe('action creation', () => {
      const simulator = new GenAiSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      let simulatorUrl: string;

      before(async () => {
        simulatorUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: simulatorUrl,
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          name: 'A GenAi action',
          connector_type_id: '.gen-ai',
          is_missing_secrets: false,
          config: {
            apiUrl: simulatorUrl,
            apiProvider: 'OpenAI',
          },
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {},
            secrets: {
              apiKey: '123',
            },
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

      it('should return 400 Bad Request when creating the connector with a apiUrl that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: 'https://api.openai.com/v1/chat/completions',
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://api.openai.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A GenAi action',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: simulatorUrl,
              apiProvider: 'OpenAI',
            },
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
        const simulator = new GenAiSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let simulatorUrl: string;
        let genAiActionId: string;

        before(async () => {
          simulatorUrl = await simulator.start();
          genAiActionId = await createConnector(simulatorUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(Object.keys(body)).to.eql(['status', 'message', 'retry', 'connector_id']);
          expect(body.connector_id).to.eql(genAiActionId);
          expect(body.status).to.eql('error');
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: genAiActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${genAiActionId}. Connector name: GenAi. Connector type: .gen-ai`,
          });
        });

        it("should fail to create an alert when the message parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'createAlert', subActionParams: {} },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: genAiActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            service_message:
              'Request validation failed (Error: [message]: expected value of type [string] but got [undefined])',
          });
        });

        it("should fail to close an alert when the alias parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${genAiActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'closeAlert', subActionParams: {} },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: genAiActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            service_message:
              'Request validation failed (Error: [alias]: expected value of type [string] but got [undefined])',
          });
        });

        describe('optional parameters', async () => {
          describe('responders', () => {
            it('should fail to create an alert when the responders is an invalid type', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          name: 'sam',
                          type: 'invalidType',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message:
                  'Request validation failed (Error: [responders.0]: types that failed validation:\n- [responders.0.0.type]: types that failed validation:\n - [responders.0.type.0]: expected value to equal [team]\n - [responders.0.type.1]: expected value to equal [user]\n - [responders.0.type.2]: expected value to equal [escalation]\n - [responders.0.type.3]: expected value to equal [schedule]\n- [responders.0.1.id]: expected value of type [string] but got [undefined]\n- [responders.0.2.username]: expected value of type [string] but got [undefined])',
              });
            });

            it('should fail to create an alert when the responders is missing the id', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          type: 'schedule',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message:
                  'Request validation failed (Error: [responders.0]: types that failed validation:\n- [responders.0.0.name]: expected value of type [string] but got [undefined]\n- [responders.0.1.id]: expected value of type [string] but got [undefined]\n- [responders.0.2.username]: expected value of type [string] but got [undefined])',
              });
            });

            it('should succeed to create an alert when the responders has a valid team and id', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          id: '123',
                          type: 'team',
                        },
                        {
                          id: '456',
                          type: 'team',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });

            it('should succeed to create an alert when the responders has a valid escalation and name', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      responders: [
                        {
                          name: 'sam',
                          type: 'escalation',
                        },
                        {
                          name: 'bob',
                          type: 'escalation',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });
          });

          describe('visibleTo', () => {
            it('should fail to create an alert when the visibleTo uses the name field with type user', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      visibleTo: [
                        {
                          name: 'sam',
                          type: 'user',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message:
                  'Request validation failed (Error: [visibleTo.0]: types that failed validation:\n- [visibleTo.0.0.type]: expected value to equal [team]\n- [visibleTo.0.1.id]: expected value of type [string] but got [undefined]\n- [visibleTo.0.2.id]: expected value of type [string] but got [undefined]\n- [visibleTo.0.3.username]: expected value of type [string] but got [undefined])',
              });
            });

            it('should succeed to create an alert when the visibleTo is set to a user', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      visibleTo: [
                        {
                          username: 'sam',
                          type: 'user',
                        },
                        {
                          username: 'bob',
                          type: 'user',
                        },
                      ],
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });
          });

          describe('details', () => {
            it('should fail to create an alert when the details field is a record of string to number', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      details: {
                        bananas: 1,
                      },
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'error',
                retry: true,
                message: 'an error occurred while running the action',
                service_message:
                  'Request validation failed (Error: [details.bananas]: expected value of type [string] but got [number])',
              });
            });

            it('should succeed to create an alert when the details field a record of string to string', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${genAiActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'createAlert',
                    subActionParams: {
                      message: 'hello',
                      details: {
                        bananas: 'hello',
                      },
                    },
                  },
                })
                .expect(200);

              expect(body).to.eql({
                connector_id: genAiActionId,
                status: 'ok',
                data: {
                  requestId: '43a29c5c-3dbf-4fa4-9c26-f4f71023e120',
                  result: 'Request will be processed',
                  took: 0.107,
                },
              });
            });
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new GenAiSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let simulatorUrl: string;
          let genAiActionId: string;
          let createAlertUrl: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            createAlertUrl = createUrlString(simulatorUrl, 'v2/alerts');
            genAiActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'createAlert', subActionParams: { message: 'message' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message' });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });

          it('should preserve the alias when it is 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });

          it('should sha256 hash the alias when it is over 512 characters when creating an alert', async () => {
            const alias = 'a'.repeat(513);

            // sha256 hash for 513 a characters
            const hashedAlias =
              'sha-02425c0f5b0dabf3d2b9115f3f7723a02ad8bcfb1534a0d231614fd42b8188f6';

            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', alias: hashedAlias });
            expect(simulator.requestUrl).to.eql(createAlertUrl);
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });

          it('should sha256 hash the alias when it is over 512 characters when closing an alert', async () => {
            const alias = 'a'.repeat(513);

            // sha256 hash for 513 a characters
            const hashedAlias =
              'sha-02425c0f5b0dabf3d2b9115f3f7723a02ad8bcfb1534a0d231614fd42b8188f6';

            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeAlert',
                  subActionParams: { alias },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, `v2/alerts/${hashedAlias}/close`)
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });

          it('should close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias: '123' } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, 'v2/alerts/123/close')
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });

          it('should close an alert with an alias that is 512 characters', async () => {
            const alias = 'a'.repeat(512);

            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'closeAlert', subActionParams: { alias } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({});
            expect(simulator.requestUrl).to.eql(
              createCloseAlertUrl(simulatorUrl, `v2/alerts/${alias}/close`)
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: genAiActionId,
              data: genAiSuccessResponse,
            });
          });
        });

        describe('error response simulator', () => {
          const simulator = new GenAiSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let simulatorUrl: string;
          let genAiActionId: string;

          before(async () => {
            simulatorUrl = await simulator.start();
            genAiActionId = await createConnector(simulatorUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when attempting to create an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'createAlert',
                  subActionParams: { message: 'message', note: 'a note' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ message: 'message', note: 'a note' });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: genAiActionId,
              service_message:
                'Status code: 422. Message: Request failed with status code 422: {"message":"failed"}',
            });
          });

          it('should return a failure when attempting to close an alert', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${genAiActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'closeAlert',
                  subActionParams: { note: 'a note', alias: '123' },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({ note: 'a note' });
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: genAiActionId,
              service_message:
                'Status code: 422. Message: Request failed with status code 422: {"message":"failed"}',
            });
          });
        });
      });

      const createConnector = async (url: string) => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'An GenAi simulator',
            connector_type_id: '.gen-ai',
            config: {
              apiUrl: url,
              apiProvider: 'OpenAI',
            },
            secrets: {
              apiKey: '123',
            },
          })
          .expect(200);

        return body.id;
      };
    });
  });
}

const createCloseAlertUrl = (baseUrl: string, path: string) => {
  return createUrlString(baseUrl, path, { identifierType: 'alias' });
};

const createUrlString = (baseUrl: string, path: string, queryParams?: Record<string, string>) => {
  const fullURL = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(queryParams ?? {})) {
    fullURL.searchParams.set(key, value);
  }

  return fullURL.toString();
};
