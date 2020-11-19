/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import getPort from 'get-port';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getWebhookServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function webhookTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('webhook action', () => {
    let webhookSimulatorURL: string = '';
    let webhookServer: http.Server;
    // need to wait for kibanaServer to settle ...
    before(async () => {
      webhookServer = await getWebhookServer();
      const availablePort = await getPort({ port: 9000 });
      webhookServer.listen(availablePort);
      webhookSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('should return 403 when creating a webhook action', async () => {
      await supertest
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
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .webhook is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });

    after(() => {
      webhookServer.close();
    });
  });
}
