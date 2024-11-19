/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import getPort from 'get-port';
import { getSlackServer } from '@kbn/actions-simulators-plugin/server/plugin';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function slackTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('slack connector', () => {
    let slackSimulatorURL: string = '';
    let slackServer: http.Server;

    before(async () => {
      slackServer = await getSlackServer();
      const availablePort = await getPort({ port: 9000 });
      slackServer.listen(availablePort);
      slackSimulatorURL = `http://localhost:${availablePort}`;
    });

    it('should return 403 when creating a slack connector', async () => {
      await supertest
        .post('/api/actions/connector')
        .set('kbn-xsrf', 'foo')
        .send({
          name: 'A slack connector',
          connector_type_id: '.slack',
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
