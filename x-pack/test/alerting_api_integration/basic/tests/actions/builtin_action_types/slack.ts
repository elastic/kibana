/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import http from 'http';
import getPort from 'get-port';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getSlackServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('slack action', () => {
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;

    before(async () => {
      slackServer = await getSlackServer();
      const availablePort = await getPort({ port: 9000 });
      slackServer.listen(availablePort);
      slackSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('should return 403 when creating a slack action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack action',
          actionTypeId: '.slack',
          secrets: {
            webhookUrl: slackSimulatorURL,
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .slack is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });

    after(() => {
      slackServer.close();
    });
  });
}
