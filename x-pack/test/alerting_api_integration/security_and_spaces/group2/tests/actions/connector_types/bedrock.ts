/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  BedrockSimulator,
  bedrockSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/bedrock_simulation';
import { DEFAULT_TOKEN_LIMIT } from '@kbn/stack-connectors-plugin/common/bedrock/constants';
import { PassThrough } from 'stream';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getUrlPrefix, ObjectRemover } from '../../../../../common/lib';

const connectorTypeId = '.bedrock';
const name = 'A bedrock action';
const secrets = {
  accessKey: 'bedrockAccessKey',
  secret: 'bedrockSecret',
};

const defaultConfig = {
  defaultModel: 'anthropic.claude-v2',
};

// eslint-disable-next-line import/no-default-export
export default function bedrockTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const configService = getService('config');
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
    after(() => {
      objectRemover.removeAll();
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

          before(async () => {
            apiUrl = await simulator.start();
            bedrockActionId = await createConnector(apiUrl);
          });

          after(() => {
            simulator.close();
          });

          it('should send a stringified JSON object', async () => {
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
              data: bedrockSuccessResponse,
            });
          });

          it('should overwrite the model when a model argument is provided', async () => {
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
              data: bedrockSuccessResponse,
            });
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
                        role: 'user',
                        content: 'Hello world',
                      },
                      {
                        role: 'system',
                        content: 'Be a good chatbot',
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
              prompt:
                '\n\nHuman:Hello world\n\nHuman:Be a good chatbot\n\nAssistant:Hi, I am a good chatbot\n\nHuman:What is 2+2? \n\nAssistant:',
              max_tokens_to_sample: DEFAULT_TOKEN_LIMIT,
              temperature: 0.5,
              stop_sequences: ['\n\nHuman:'],
            });
            expect(body).to.eql({
              status: 'ok',
              connector_id: bedrockActionId,
              data: { message: bedrockSuccessResponse.completion },
            });
          });

          it('should invoke stream with assistant AI body argument formatted to bedrock expectations', async () => {
            await new Promise<void>((resolve, reject) => {
              let responseBody: string = '';

              const passThrough = new PassThrough();

              supertest
                .post(`/internal/elastic_assistant/actions/connector/${bedrockActionId}/_execute`)
                .set('kbn-xsrf', 'foo')
                .on('error', reject)
                .send({
                  params: {
                    subAction: 'invokeStream',
                    subActionParams: {
                      messages: [
                        {
                          role: 'user',
                          content: 'Hello world',
                        },
                      ],
                    },
                  },
                  assistantLangChain: false,
                })
                .pipe(passThrough);

              passThrough.on('data', (chunk) => {
                responseBody += chunk.toString();
              });

              passThrough.on('end', () => {
                expect(responseBody).to.eql('Hello world, what a unique string!');
                resolve();
              });
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
            service_message:
              'Status code: 422. Message: API Error: Unprocessable Entity - Malformed input request: extraneous key [ooooo] is not permitted, please reformat your input and try again.',
          });
        });
      });
    });
  });
}
