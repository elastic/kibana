/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import httpProxy from 'http-proxy';
import expect from '@kbn/expect';
import http from 'http';
import getPort from 'get-port';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers';
import { getSlackServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const configService = getService('config');

  const mockedSlackActionIdForWebhook = async (slackSimulatorURL: string) => {
    const { body: createdSimulatedAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'A slack simulator',
        connector_type_id: '.slack',
        secrets: {
          webhookUrl: slackSimulatorURL,
        },
        config: { type: 'webhook' },
      })
      .expect(200);

    return createdSimulatedAction.id;
  };

  const mockedSlackActionIdForWebApi = async () => {
    const { body: createdSimulatedAction } = await supertest
      .post('/api/actions/connector')
      .set('kbn-xsrf', 'foo')
      .send({
        name: 'A slack simulator',
        connector_type_id: '.slack',
        secrets: {
          token: 'some token',
        },
        config: { type: 'web_api' },
      })
      .expect(200);

    return createdSimulatedAction.id;
  };

  describe('Slack', () => {
    let slackSimulatorURL = '';
    let slackServer: http.Server;
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    before(async () => {
      slackServer = await getSlackServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      if (!slackServer.listening) {
        slackServer.listen(availablePort);
      }
      slackSimulatorURL = `http://localhost:${availablePort}`;
      proxyServer = await getHttpProxyServer(
        slackSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    after(() => {
      slackServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });

    describe('Slack - Action Creation', () => {
      it('should return 200 when creating a slack action with webhook type successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A slack action',
            connector_type_id: '.slack',
            config: { type: 'webhook' },
            secrets: {
              webhookUrl: slackSimulatorURL,
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          name: 'A slack action',
          connector_type_id: '.slack',
          config: { type: 'webhook' },
        });

        expect(typeof createdAction.id).to.be('string');

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          name: 'A slack action',
          connector_type_id: '.slack',
          config: { type: 'webhook' },
        });
      });

      it('should return 200 when creating a slack action with web api type successfully', async () => {
        const { body: createdAction } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A slack web api action',
            connector_type_id: '.slack',
            config: { type: 'web_api' },
            secrets: {
              token: 'some token',
            },
          })
          .expect(200);

        expect(createdAction).to.eql({
          id: createdAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          name: 'A slack web api action',
          connector_type_id: '.slack',
          config: { type: 'web_api' },
        });

        expect(typeof createdAction.id).to.be('string');

        const { body: fetchedAction } = await supertest
          .get(`/api/actions/connector/${createdAction.id}`)
          .expect(200);

        expect(fetchedAction).to.eql({
          id: fetchedAction.id,
          is_preconfigured: false,
          is_deprecated: false,
          is_missing_secrets: false,
          name: 'A slack web api action',
          connector_type_id: '.slack',
          config: { type: 'web_api' },
        });
      });

      it('should respond with a 400 Bad Request when creating a slack action with no webhookUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A slack action',
            connector_type_id: '.slack',
            secrets: {},
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: types that failed validation:\n- [0.webhookUrl]: expected value of type [string] but got [undefined]\n- [1.token]: expected value of type [string] but got [undefined]',
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a slack action with not present in allowedHosts webhookUrl', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A slack action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'http://slack.mynonexistent.com/other/stuff/in/the/path',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message: `error validating action type secrets: error configuring slack action: target url \"http://slack.mynonexistent.com/other/stuff/in/the/path\" is not added to the Kibana config xpack.actions.allowedHosts`,
            });
          });
      });

      it('should respond with a 400 Bad Request when creating a slack action with a webhookUrl with no hostname', async () => {
        await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'A slack action',
            connector_type_id: '.slack',
            secrets: {
              webhookUrl: 'fee-fi-fo-fum',
            },
          })
          .expect(400)
          .then((resp: any) => {
            expect(resp.body).to.eql({
              statusCode: 400,
              error: 'Bad Request',
              message:
                'error validating action type secrets: error configuring slack action: unable to parse host name from webhookUrl',
            });
          });
      });
    });

    describe('Slack - Executor', () => {
      it('should handle firing with a simulated success', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebhook(slackSimulatorURL);

        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              message: 'success',
            },
          })
          .expect(200);
        expect(result.status).to.eql('ok');
        expect(proxyHaveBeenCalled).to.equal(true);
      });

      it('should handle firing with a simulated success', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebApi();
        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              subAction: 'postMessage',
              subActionParams: { channels: ['general'], text: 'really important text' },
            },
          })
          .expect(200);

        expect(result).to.eql({
          status: 'error',
          message: 'error posting slack message',
          connector_id: '.slack',
          service_message: 'invalid_auth',
        });
      });

      it('should handle an empty message error', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebhook(slackSimulatorURL);

        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              message: '',
            },
          })
          .expect(200);
        expect(result.status).to.eql('error');
        expect(result.message).to.equal(
          "error validating action params: Cannot destructure property 'Symbol(Symbol.iterator)' of 'undefined' as it is undefined."
        );
      });

      it('should handle a 40x slack error', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebhook(slackSimulatorURL);

        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              message: 'invalid_payload',
            },
          })
          .expect(200);
        expect(result.status).to.equal('error');
        expect(result.message).to.match(/unexpected http response from slack: /);
      });

      it('should handle a 429 slack error', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebhook(slackSimulatorURL);

        const dateStart = new Date().getTime();
        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              message: 'rate_limit',
            },
          })
          .expect(200);

        expect(result.status).to.equal('error');
        expect(result.message).to.match(/error posting a slack message, retry at \d\d\d\d-/);

        const dateRetry = new Date(result.retry).getTime();
        expect(dateRetry).to.greaterThan(dateStart);
      });

      it('should handle a 500 slack error', async () => {
        const simulatedActionId = await mockedSlackActionIdForWebhook(slackSimulatorURL);

        const { body: result } = await supertest
          .post(`/api/actions/connector/${simulatedActionId}/_execute`)
          .set('kbn-xsrf', 'foo')
          .send({
            params: {
              message: 'status_500',
            },
          })
          .expect(200);

        expect(result.status).to.equal('error');
        expect(result.message).to.match(/error posting a slack message, retry later/);
        expect(result.retry).to.equal(true);
      });
    });
  });
};
