/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import httpProxy from 'http-proxy';
import { getHttpProxyServer } from '@kbn/alerting-api-integration-helpers/get_proxy_server';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  describe('Slack API action', () => {
    let simulatedActionId = '';
    let proxyHaveBeenCalled = false;
    let proxyServer: httpProxy | undefined;

    before(async () => {
      proxyServer = await getHttpProxyServer(
        kibanaServer.resolveUrl('/'),
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    after(() => {
      if (proxyServer) {
        proxyServer.close();
      }
    });

    it('should return 200 when creating a slack action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack api action',
          connector_type_id: '.slack_api',
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
          name: 'A slack simulator',
          connector_type_id: '.slack_api',
          secrets: {
            token: 'fake token',
          },
        })
        .expect(200);

      simulatedActionId = createdSimulatedAction.id;
    });

    it('should handle firing with a simulated success for getChannels call', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'getChannels',
          },
        })
        .expect(200);
      expect(result).to.eql({
        status: 'ok',
        data: { id: '123', key: 'CK-2', ok: true },
        connector_id: '.slack_api',
      });
    });

    it('should handle firing with a simulated success for postMessage call', async () => {
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
      expect(result).to.eql({
        status: 'ok',
        data: { id: '123', key: 'CK-1', ok: true },
        connector_id: '.slack_api',
      });
      expect(proxyHaveBeenCalled).to.equal(true);
    });

    it('should handle an no text error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'postMessage',
            subActionParams: { channels: ['general'] },
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.eql(
        `error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getChannels]\n- [1.subActionParams.text]: expected value of type [string] but got [undefined]`
      );
    });

    it('should handle an empty text error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: '' },
          },
        })
        .expect(200);
      expect(result.status).to.eql('error');
      expect(result.message).to.eql(
        `error validating action params: types that failed validation:\n- [0.subAction]: expected value to equal [getChannels]\n- [1.subActionParams.text]: value has length [0] but it must have a minimum length of [1].`
      );
    });

    it('should handle a 40x slack error', async () => {
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'invalid_payload' },
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.equal('unexpected http response from slack: 400 Bad Request');
    });

    it('should handle a 429 slack error', async () => {
      const dateStart = new Date().getTime();
      const { body: result } = await supertest
        .post(`/api/actions/connector/${simulatedActionId}/_execute`)
        .set('kbn-xsrf', 'foo')
        .send({
          params: {
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'rate_limit' },
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
            subAction: 'postMessage',
            subActionParams: { channels: ['general'], text: 'status_500' },
          },
        })
        .expect(200);

      expect(result.status).to.equal('error');
      expect(result.message).to.match(/error posting a slack message, retry later/);
      expect(result.retry).to.equal(true);
    });
  });
}
