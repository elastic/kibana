/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { IValidatedEvent } from '@kbn/event-log-plugin/server';

import {
  TinesSimulator,
  tinesStory1,
  tinesStory2,
  tinesAgentWebhook,
  tinesWebhookSuccessResponse,
} from '@kbn/actions-simulators-plugin/server/tines_simulation';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { getEventLog } from '../../../../../common/lib';

const connectorTypeId = '.tines';
const name = 'A tines action';
const secrets = {
  email: 'some@email.com',
  token: 'tinesToken',
};
const webhook = {
  name: 'webhook 1',
  id: 1,
  storyId: 1,
  path: 'path',
  secret: 'secret',
};

// eslint-disable-next-line import/no-default-export
export default function tinesTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');
  const retry = getService('retry');

  const createConnector = async (url: string) => {
    const { body } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name,
        connector_type_id: connectorTypeId,
        config: { url },
        secrets,
      })
      .expect(200);

    return body.id;
  };

  describe('Tines', () => {
    describe('action creation', () => {
      const simulator = new TinesSimulator({
        returnError: false,
        proxy: {
          config: configService.get('kbnTestServer.serverArgs'),
        },
      });
      const config = { url: '' };

      before(async () => {
        config.url = await simulator.start();
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

      it('should return 400 Bad Request when creating the connector without the url', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {},
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: [url]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should return 400 Bad Request when creating the connector with a url that is not allowed', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name,
            connector_type_id: connectorTypeId,
            config: {
              url: 'http://tines.mynonexistent.com',
            },
            secrets,
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type config: error validating url: target url "http://tines.mynonexistent.com" is not added to the Kibana config xpack.actions.allowedHosts',
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
                'error validating action type secrets: [email]: expected value of type [string] but got [undefined]',
            });
          });
      });
    });

    describe('executor', () => {
      describe('validation', () => {
        const simulator = new TinesSimulator({
          proxy: {
            config: configService.get('kbnTestServer.serverArgs'),
          },
        });
        let tinesActionId: string;

        before(async () => {
          const url = await simulator.start();
          tinesActionId = await createConnector(url);
        });

        after(() => {
          simulator.close();
        });

        it('should fail when the params is empty', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {},
            });
          expect(200);

          expect(Object.keys(body)).to.eql([
            'status',
            'message',
            'retry',
            'errorSource',
            'connector_id',
          ]);
          expect(body.connector_id).to.eql(tinesActionId);
          expect(body.status).to.eql('error');
        });

        it('should fail when the subAction is invalid', async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'invalidAction' },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message: `Sub action "invalidAction" is not registered. Connector id: ${tinesActionId}. Connector name: Tines. Connector type: .tines`,
          });
        });

        it("should fail to get webhooks when the storyId parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'webhooks', subActionParams: {} },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [storyId]: expected value of type [number] but got [undefined])',
          });
        });

        it("should fail to run when the webhook parameter isn't included", async () => {
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: { subAction: 'run', subActionParams: { body: '' } },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.FRAMEWORK,
            service_message:
              'Invalid subActionsParams: [webhook] or [webhookUrl] expected but got none',
          });
        });

        it("should fail to run when the webhook.story_id parameter isn't included", async () => {
          const { storyId, ...wrongWebhook } = webhook;
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'run',
                subActionParams: { body: '', webhook: wrongWebhook },
              },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [webhook.storyId]: expected value of type [number] but got [undefined])',
          });
        });

        it("should fail to run when the webhook.name parameter isn't included", async () => {
          const { name: _, ...wrongWebhook } = webhook;
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'run',
                subActionParams: { body: '', webhook: wrongWebhook },
              },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [webhook.name]: expected value of type [string] but got [undefined])',
          });
        });

        it("should fail to run when the webhook.path parameter isn't included", async () => {
          const { path, ...wrongWebhook } = webhook;
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'run',
                subActionParams: { body: '', webhook: wrongWebhook },
              },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [webhook.path]: expected value of type [string] but got [undefined])',
          });
        });

        it("should fail to run when the webhook.secret parameter isn't included", async () => {
          const { secret, ...wrongWebhook } = webhook;
          const { body } = await supertest
            .post(`/api/actions/connector/${tinesActionId}/_execute`)
            .set('kbn-xsrf', 'foo')
            .send({
              params: {
                subAction: 'run',
                subActionParams: { body: '', webhook: wrongWebhook },
              },
            })
            .expect(200);

          expect(body).to.eql({
            connector_id: tinesActionId,
            status: 'error',
            retry: true,
            message: 'an error occurred while running the action',
            errorSource: TaskErrorSource.USER,
            service_message:
              'Request validation failed (Error: [webhook.secret]: expected value of type [string] but got [undefined])',
          });
        });
      });

      describe('execution', () => {
        describe('successful response simulator', () => {
          const simulator = new TinesSimulator({
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });
          let url: string;
          let tinesActionId: string;

          before(async () => {
            url = await simulator.start();
            tinesActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should get stories', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'stories', subActionParams: {} },
              })
              .expect(200);

            expect(simulator.requestUrl).to.eql(getTinesStoriesUrl(url, { per_page: '500' }));
            expect(body).to.eql({
              status: 'ok',
              connector_id: tinesActionId,
              data: {
                stories: [
                  { id: tinesStory1.id, name: tinesStory1.name, published: true },
                  { id: tinesStory2.id, name: tinesStory2.name, published: true },
                ],
                incompleteResponse: false,
              },
            });

            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: tinesActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { equal: 1 }],
                  ['execute', { equal: 1 }],
                ]),
              });
            });

            const executeEvent = events[1];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(2);
          });

          it('should get webhooks', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'webhooks', subActionParams: { storyId: 1 } },
              })
              .expect(200);

            expect(simulator.requestUrl).to.eql(
              getTinesAgentsUrl(url, { story_id: '1', per_page: '500' })
            );
            expect(body).to.eql({
              status: 'ok',
              connector_id: tinesActionId,
              data: {
                webhooks: [
                  {
                    id: tinesAgentWebhook.id,
                    name: tinesAgentWebhook.name,
                    storyId: tinesAgentWebhook.story_id,
                    path: tinesAgentWebhook.options.path,
                    secret: tinesAgentWebhook.options.secret,
                  },
                ],
                incompleteResponse: false,
              },
            });
            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: tinesActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 2 }],
                  ['execute', { gte: 2 }],
                ]),
              });
            });

            const executeEvent = events[3];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(2);
          });

          it('should run the webhook', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'run', subActionParams: { body: '["test"]', webhook } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(['test']);
            expect(simulator.requestUrl).to.eql(getTinesWebhookPostUrl(url, webhook));
            expect(body).to.eql({
              status: 'ok',
              connector_id: tinesActionId,
              data: tinesWebhookSuccessResponse,
            });
            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: tinesActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 3 }],
                  ['execute', { gte: 3 }],
                ]),
              });
            });

            const executeEvent = events[5];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(8);
          });

          it('should run the webhook url', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'run',
                  subActionParams: {
                    body: '["test"]',
                    webhookUrl: getTinesWebhookPostUrl(url, webhook),
                  },
                },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(['test']);
            expect(simulator.requestUrl).to.eql(getTinesWebhookPostUrl(url, webhook));
            expect(body).to.eql({
              status: 'ok',
              connector_id: tinesActionId,
              data: tinesWebhookSuccessResponse,
            });
            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: tinesActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 3 }],
                  ['execute', { gte: 3 }],
                ]),
              });
            });

            const executeEvent = events[5];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(8);
          });
        });

        describe('error response simulator', () => {
          const simulator = new TinesSimulator({
            returnError: true,
            proxy: {
              config: configService.get('kbnTestServer.serverArgs'),
            },
          });

          let tinesActionId: string;

          before(async () => {
            const url = await simulator.start();
            tinesActionId = await createConnector(url);
          });

          after(() => {
            simulator.close();
          });

          it('should return a failure when attempting to get stories', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'stories',
                  subActionParams: {},
                },
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: tinesActionId,
              errorSource: TaskErrorSource.FRAMEWORK,
              service_message: 'Status code: 422. Message: API Error: Unprocessable Entity',
            });
            const events: IValidatedEvent[] = await retry.try(async () => {
              return await getEventLog({
                getService,
                spaceId: 'default',
                type: 'action',
                id: tinesActionId,
                provider: 'actions',
                actions: new Map([
                  ['execute-start', { gte: 1 }],
                  ['execute', { gte: 1 }],
                ]),
              });
            });

            const executeEvent = events[1];
            expect(executeEvent?.kibana?.action?.execution?.usage?.request_body_bytes).to.be(2);
          });

          it('should return a failure when attempting to get webhooks', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: {
                  subAction: 'webhooks',
                  subActionParams: { storyId: 1 },
                },
              })
              .expect(200);

            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: tinesActionId,
              errorSource: TaskErrorSource.FRAMEWORK,
              service_message: 'Status code: 422. Message: API Error: Unprocessable Entity',
            });
          });

          it('should return a failure when attempting to run', async () => {
            const { body } = await supertest
              .post(`/api/actions/connector/${tinesActionId}/_execute`)
              .set('kbn-xsrf', 'foo')
              .send({
                params: { subAction: 'run', subActionParams: { body: '["test"]', webhook } },
              })
              .expect(200);

            expect(simulator.requestData).to.eql(['test']);
            expect(body).to.eql({
              status: 'error',
              message: 'an error occurred while running the action',
              retry: true,
              connector_id: tinesActionId,
              errorSource: TaskErrorSource.FRAMEWORK,
              service_message: 'Status code: 422. Message: API Error: Unprocessable Entity',
            });
          });
        });
      });
    });
  });
}

const createTinesUrlString = (
  baseUrl: string,
  path: string,
  queryParams?: Record<string, string>
) => {
  const fullURL = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(queryParams ?? {})) {
    fullURL.searchParams.set(key, value);
  }
  return fullURL.toString();
};

const getTinesStoriesUrl = (baseUrl: string, queryParams: Record<string, string>) =>
  createTinesUrlString(baseUrl, 'api/v1/stories', queryParams);
const getTinesAgentsUrl = (baseUrl: string, queryParams: Record<string, string>) =>
  createTinesUrlString(baseUrl, 'api/v1/agents', queryParams);
const getTinesWebhookPostUrl = (baseUrl: string, { path, secret }: typeof webhook) =>
  createTinesUrlString(baseUrl, `webhook/${path}/${secret}`);
