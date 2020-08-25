/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import httpProxy from 'http-proxy';
import http from 'http';
import expect from '@kbn/expect';
import { URL, format as formatUrl } from 'url';
import getPort from 'get-port';
import { getHttpProxyServer } from '../../../../common/lib/get_proxy_server';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getExternalServiceSimulatorPath,
  ExternalServiceSimulator,
  getWebhookServer,
} from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

const defaultValues: Record<string, any> = {
  headers: null,
  method: 'post',
};

function parsePort(url: Record<string, string>): Record<string, string | null | number> {
  return {
    ...url,
    port: url.port ? parseInt(url.port, 10) : url.port,
  };
}

// eslint-disable-next-line import/no-default-export
export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const kibanaServer = getService('kibanaServer');
  const configService = getService('config');

  async function createWebhookAction(
    webhookSimulatorURL: string,
    config: Record<string, string | Record<string, string>> = {},
    kibanaUrlWithCreds: string
  ): Promise<string> {
    const { user, password } = extractCredentialsFromUrl(kibanaUrlWithCreds);
    const url =
      config.url && typeof config.url === 'object' ? parsePort(config.url) : webhookSimulatorURL;
    const composedConfig = {
      headers: {
        'Content-Type': 'text/plain',
      },
      ...config,
      url,
    };

    const { body: createdAction } = await supertest
      .post('/api/actions/action')
      .set('kbn-xsrf', 'test')
      .send({
        name: 'A generic Webhook action',
        actionTypeId: '.webhook',
        secrets: {
          user,
          password,
        },
        config: composedConfig,
      })
      .expect(200);

    return createdAction.id;
  }

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    let kibanaURL: string = '<could not determine kibana url>';
    let proxyServer: httpProxy | undefined;
    let proxyHaveBeenCalled = false;

    // need to wait for kibanaServer to settle ...
    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: getPort.makeRange(9000, 9100) });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;

      kibanaURL = kibanaServer.resolveUrl(
        getExternalServiceSimulatorPath(ExternalServiceSimulator.WEBHOOK)
      );

      proxyServer = await getHttpProxyServer(
        webhookSimulatorURL,
        configService.get('kbnTestServer.serverArgs'),
        () => {
          proxyHaveBeenCalled = true;
        }
      );
    });

    it('should return 200 when creating a webhook action successfully', async () => {
      const { body: createdAction } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          actionTypeId: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: webhookSimulatorURL,
          },
        })
        .expect(200);

      expect(createdAction).to.eql({
        id: createdAction.id,
        isPreconfigured: false,
        name: 'A generic Webhook action',
        actionTypeId: '.webhook',
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
      });

      expect(typeof createdAction.id).to.be('string');

      const { body: fetchedAction } = await supertest
        .get(`/api/actions/action/${createdAction.id}`)
        .expect(200);

      expect(fetchedAction).to.eql({
        id: fetchedAction.id,
        isPreconfigured: false,
        name: 'A generic Webhook action',
        actionTypeId: '.webhook',
        config: {
          ...defaultValues,
          url: webhookSimulatorURL,
        },
      });
    });

    it('should send authentication to the webhook target', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL, {}, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'authenticate',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    it('should support the POST method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'post' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_post_method',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    it('should support the PUT method against webhook target', async () => {
      const webhookActionId = await createWebhookAction(
        webhookSimulatorURL,
        { method: 'put' },
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success_put_method',
          },
        })
        .expect(200);

      expect(proxyHaveBeenCalled).to.equal(true);
      expect(result.status).to.eql('ok');
    });

    it('should handle target webhooks that are not added to allowedHosts', async () => {
      const { body: result } = await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic Webhook action',
          actionTypeId: '.webhook',
          secrets: {
            user: 'username',
            password: 'mypassphrase',
          },
          config: {
            url: 'http://a.none.allowedHosts.webhook/endpoint',
          },
        })
        .expect(400);

      expect(result.error).to.eql('Bad Request');
      expect(result.message).to.match(/is not added to the Kibana config/);
    });

    it('should handle unreachable webhook targets', async () => {
      const webhookActionId = await createWebhookAction(
        'http://some.non.existent.com/endpoint',
        {},
        kibanaURL
      );
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling webhook, retry later/);
    });

    it('should handle failing webhook targets', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL, {}, kibanaURL);
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'failure',
          },
        })
        .expect(200);

      expect(result.status).to.eql('error');
      expect(result.message).to.match(/error calling webhook, retry later/);
      expect(result.serviceMessage).to.eql('[500] Internal Server Error');
    });

    after(() => {
      webhookServer.close();
      if (proxyServer) {
        proxyServer.close();
      }
    });
  });
}

function extractCredentialsFromUrl(url: string): { url: string; user: string; password: string } {
  const parsedUrl = new URL(url);
  const { password, username: user } = parsedUrl;
  return { url: formatUrl(parsedUrl, { auth: false }), user, password };
}
