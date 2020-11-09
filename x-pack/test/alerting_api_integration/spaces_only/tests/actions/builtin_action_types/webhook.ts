/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import getPort from 'get-port';
import expect from '@kbn/expect';
import { URL, format as formatUrl } from 'url';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getWebhookServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  async function createWebhookAction(
    webhookSimulatorURL: string,
    config: Record<string, string | Record<string, string>> = {}
  ): Promise<string> {
    const url = formatUrl(new URL(webhookSimulatorURL), { auth: false });
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
        secrets: {},
        config: composedConfig,
      })
      .expect(200);

    return createdAction.id;
  }

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('webhook can be executed without username and password', async () => {
      const webhookActionId = await createWebhookAction(webhookSimulatorURL);
      const { body: result } = await supertest
        .post(`/api/actions/action/${webhookActionId}/_execute`)
        .set('kbn-xsrf', 'test')
        .send({
          params: {
            body: 'success',
          },
        })
        .expect(200);

      expect(result.status).to.eql('ok');
    });

    after(() => {
      webhookServer.close();
    });
  });
}
