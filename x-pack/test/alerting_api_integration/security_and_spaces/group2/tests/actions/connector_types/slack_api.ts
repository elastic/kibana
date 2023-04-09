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
export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const configService = getService('config');

  describe('Slack API action', () => {
    let simulatedActionId = '';
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
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

    it.only('should return 200 when creating a slack action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          config: {},
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
        name: 'A slack api action',
        connector_type_id: '.slack_api',
        config: {},
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
        name: 'A slack api action',
        connector_type_id: '.slack_api',
        config: {},
      });
    });

    it('should respond with a 400 Bad Request when creating a slack action with no token', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
          secrets: {},
        })
        .expect(400)
        .then((resp: any) => {
          expect(resp.body).to.eql({
            statusCode: 400,
            error: 'Bad Request',
            message:
              'error validating action type secrets: [token]: expected value of type [string] but got [undefined]',
          });
        });
    });

    it('should create our slack simulator action successfully', async () => {
      const { body: createdSimulatedAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api simulator',
          connector_type_id: '.slack_api',
          secrets: {
            token: 'some token',
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle firing with a simulated success', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'some text' },
          },
        })
        .expect(200);
      expect(result.status).to.eql('ok');
      expect(proxyHaveBeenCalled).to.equal(true);
    });

    it('should handle an empty message error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            params: {
              subAction: 'postMessage',
              subActionParams: { channels: ['general'], text: '' },
            },
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error validating action params: \[message\]: /);
    });

    it('should handle a 40x slack error', async () => {
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

    after(() => {
      slackServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}
