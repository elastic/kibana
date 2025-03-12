/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  BedrockSimulator,
  bedrockClaude2SuccessResponse,
} from '@kbn/actions-simulators-plugin/server/bedrock_simulation';
import { DEFAULT_TOKEN_LIMIT } from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { IValidatedEvent } from '@kbn/event-log-plugin/generated/schemas';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog, getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

const connectorTypeId = '.bedrock';
const name = 'A bedrock action';
const secrets = {
  accessKey: 'bedrockAccessKey',
  secret: 'bedrockSecret',
};

const defaultConfig = {
  defaultModel: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
};

// eslint-disable-next-line import/no-default-export
export default function bedrockTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const configService = getService('config');
  const retry = getService('retry');
  const createConnector = async (apiUrl: string, spaceId?: string) => {
    const result = await supertest
      .post(`${getUrlPrefix(spaceId ?? 'default')}/api/actions/connector`)
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { ...defaultConfig, apiUrl },
        secrets,
      })
      .expect(200);

    const { body } = result;

    objectRemover.add(spaceId ?? 'default', body.id, 'connector', 'actions');

    return body.id;
  };

  describe('Bedrock', () => {
    after(async () => {
      await objectRemover.removeAll();
    });
    describe('action creation', () => {
      const simulator = new BedrockSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { ...defaultConfig, apiUrl: '' };

      before(async () => {
        config.apiUrl = await simulator.start();
      });

      after(() => {
        simulator.close();
      });

      it('should return 200 when creating the connector', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
            secrets,
          })
          .expect(200);
        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name,
          connector_type_id: connectorTypeId,
          is_missing_secrets: false,
          config,
        });
      });

      it('Falls back to default model when connector is created without the model', async () => {
        const { defaultModel: _, ...rest } = config;
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: rest,
            secrets,
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_system_action: false,
          is_deprecated: false,
          name,
          connector_type_id: connectorTypeId,
          is_missing_secrets: false,
          config,
        });
      });

      it('should return 400 Bad Request when creating the connector without the apiUrl', async () => {
        const { apiUrl: _, ...rest } = config;
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: rest,
            secrets,
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
            name,
            connector_type_id: connectorTypeId,
            config: {
              ...defaultConfig,
              apiUrl: 'http://bedrock.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: Error configuring Amazon Bedrock action: Error: error validating url: target url "http://bedrock.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector without secrets', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [accessKey]: expected value of type [string] but got [undefined]',
            });
          });
      });
      it('should return 400 Bad Request when creating the connector without accessKey secret', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
            secrets: {
              secret: 'secret',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [accessKey]: expected value of type [string] but got [undefined]',
            });
          });
      });
      it('should return 400 Bad Request when creating the connector without secret secret', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config,
            secrets: {
              accessKey: 'accessKey',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: [secret]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('executor', () => {
      describe('validation', () => {
        const simulator = new BedrockSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let bedrockActionId: string;

        before(async () => {
          const apiUrl = await simulator.start();
          bedrockActionId = await createConnector(apiUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${bedrockActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: bedrockActionId,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
            errorSource: TaskErrorSource.USER,
          });
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${bedrockActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: bedrockActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${bedrockActionId}. Connector name: Amazon Bedrock. Connector type: .bedrock`,
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new BedrockSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let apiUrl: string;
          let bedrockActionId: string;
          const DEFAULT_BODY = {
            anthropic_version: 'bedrock-2023-05-31',
            messages: [{ role: 'user', content: 'Hello world' }],
            max_tokens: DEFAULT_TOKEN_LIMIT,
            stop_sequences: ['\n\nHuman:'],
          };

          before(async () => {
            apiUrl = await simulator.start();
            bedrockActionId = await createConnector(apiUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should send a stringified JSON object with latest body', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${bedrockActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'test',
                  subActionParams: {
                    body: JSON.stringify(DEFAULT_BODY),
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(DEFAULT_BODY);
            expect(simulator.requestUrl).to.eql(
              `${apiUrl}/model/${defaultConfig.defaultModel}/invoke`
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: bedrockActionId,
              data: {
                ...bedrockClaude2SuccessResponse,
                usage: {
                  input_tokens: 41,
                  output_tokens: 64,
                },
              },
            });

            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: bedrockActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { equal: 1 }],
                  ['execute', { equal: 1 }],
                ]),
              });
            });

            const executeEvent = events[1];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(145);
          });

          it('should overwrite the model when a model argument is provided', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${bedrockActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'test',
                  subActionParams: {
                    body: JSON.stringify(DEFAULT_BODY),
                    model: 'some-other-model',
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(DEFAULT_BODY);
            expect(simulator.requestUrl).to.eql(`${apiUrl}/model/some-other-model/invoke`);
            expect(body).to.eql({
              status: 'ok',
              connector_id: bedrockActionId,
              data: {
                ...bedrockClaude2SuccessResponse,
                usage: {
                  input_tokens: 41,
                  output_tokens: 64,
                },
              },
            });

            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: bedrockActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 2 }],
                  ['execute', { gte: 2 }],
                ]),
              });
            });

            const executeEvent = events[3];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(145);
          });

          it('should invoke AI with assistant AI body argument formatted to bedrock expectations', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${bedrockActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'invokeAI',
                  subActionParams: {
                    messages: [
                      {
                        role: 'system',
                        content: 'Be a good chatbot',
                      },
                      {
                        role: 'user',
                        content: 'Hello world',
                      },
                      {
                        role: 'assistant',
                        content: 'Hi, I am a good chatbot',
                      },
                      {
                        role: 'user',
                        content: 'What is 2+2?',
                      },
                    ],
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql({
              anthropic_version: 'bedrock-2023-05-31',
              messages: [
                { role: 'user', content: 'Hello world' },
                { role: 'assistant', content: 'Hi, I am a good chatbot' },
                { role: 'user', content: 'What is 2+2?' },
              ],
              system: 'Be a good chatbot',
              max_tokens: DEFAULT_TOKEN_LIMIT,
              temperature: 0,
            });
            expect(body).to.eql({
              status: 'ok',
              connector_id: bedrockActionId,
              data: {
                message: bedrockClaude2SuccessResponse.completion,
                usage: {
                  input_tokens: 41,
                  output_tokens: 64,
                },
              },
            });

            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: bedrockActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 3 }],
                  ['execute', { gte: 3 }],
                ]),
              });
            });

            const executeEvent = events[5];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(256);
          });

          describe('Token tracking dashboard', () => {
            const dashboardId = 'specific-dashboard-id-default';

            it('should not create a dashboard when user does not have kibana event log permissions', async () => {
              const { body } = await supertestWithoutAuth
                .post(`/api/actions/connector/${bedrockActionId}/_execute`)
                .auth('global_read', 'global_read-password')
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'getDashboard',
                    subActionParams: {
                      dashboardId,
                    },
                  },
                })
                .expect(200);

              // check dashboard has not been created
              await supertest
                .get(`/api/saved_objects/dashboard/${dashboardId}`)
                .set('kbn-xsrf', 'foo')
                .expect(404);
              expect(body).to.eql({
                status: 'ok',
                connector_id: bedrockActionId,
                data: { available: false },
              });
            });

            it('should create a dashboard when user has correct permissions', async () => {
              const { body } = await supertest
                .post(`/api/actions/connector/${bedrockActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .send({
                  params: {
                    subAction: 'getDashboard',
                    subActionParams: {
                      dashboardId,
                    },
                  },
                })
                .expect(200);

              // check dashboard has been created
              await retry.try(async () =>
                supertest
                  .get(`/api/saved_objects/dashboard/${dashboardId}`)
                  .set('kbn-xsrf', 'foo')
                  .expect(200)
              );

              objectRemover.add('default', dashboardId, 'dashboard', 'saved_objects');

              expect(body).to.eql({
                status: 'ok',
                connector_id: bedrockActionId,
                data: { available: true },
              });
            });
          });
        });
        describe('successful deprecated response simulator', () => {
          const simulator = new BedrockSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let apiUrl: string;
          let bedrockActionId: string;

          before(async () => {
            apiUrl = await simulator.start();
            bedrockActionId = await createConnector(apiUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should send a stringified JSON object with deprecated body', async () => {
            const DEFAULT_BODY = {
              prompt: `Hello world!`,
              max_tokens_to_sample: 300,
              stop_sequences: ['\n\nHuman:'],
            };
            const { body } = await supertest
              .post(`/api/actions/connector/${bedrockActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'test',
                  subActionParams: {
                    body: JSON.stringify(DEFAULT_BODY),
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(DEFAULT_BODY);
            expect(simulator.requestUrl).to.eql(
              `${apiUrl}/model/${defaultConfig.defaultModel}/invoke`
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: bedrockActionId,
              data: bedrockClaude2SuccessResponse,
            });
          });
        });
      });

      describe('error response simulator', () => {
        const simulator = new BedrockSimulator({
          returnError: true,
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });

        let bedrockActionId: string;

        before(async () => {
          const apiUrl = await simulator.start();
          bedrockActionId = await createConnector(apiUrl);
        });

        after(() => {
          simulator.close();
        });

        it('should return a failure when error happens', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${bedrockActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            })
            .expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: bedrockActionId,
            errorSource: TaskErrorSource.USER,
            message:
              'error validating action params: [subAction]: expected value of type [string] but got [undefined]',
            retry: false,
          });
        });

        it('should return an error when error happens', async () => {
          const DEFAULT_BODY = {
            prompt: `Hello world!`,
            max_tokens_to_sample: 300,
            stop_sequences: ['\n\nHuman:'],
          };
          const { body } = await supertest
            .post(`/api/actions/connector/${bedrockActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'test',
                subActionParams: {
                  body: JSON.stringify(DEFAULT_BODY),
                },
              },
            })
            .expect(200);

          expect(body).to.eql({
            status: 'error',
            connector_id: bedrockActionId,
            message: 'an error occurred while running the action',
            retry: true,
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message:
              'Status code: 422. Message: API Error: Unprocessable Entity - Malformed input request: extraneous key [ooooo] is not permitted, please reformat your input and try again.',
          });
        });
      });
    });
  });
}
