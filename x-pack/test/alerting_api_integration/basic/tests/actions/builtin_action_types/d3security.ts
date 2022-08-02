/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import http from 'http';
import getPort from 'get-port';
import { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getD3SecurityServer } from '../../../../common/fixtures/plugins/actions_simulators/server/plugin';

// eslint-disable-next-line import/no-default-export
export default function d3securityTest({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('d3security action', () => {
    let d3securitySimulatorURL: string = '';
    let d3securityServer: http.Server;
    // need to wait for kibanaServer to settle ...
    before(async () => {
      d3securityServer = await getD3SecurityServer();
      const availablePort = await getPort({ port: 9000 });
      d3securityServer.listen(availablePort);
      d3securitySimulatorURL = `http://localhost:${availablePort}`;
    });

    it('should return 403 when creating a d3security action', async () => {
      await supertest
        .post('/api/actions/action')
        .set('kbn-xsrf', 'test')
        .send({
          name: 'A generic D3Security action',
          actionTypeId: '.d3security',
          secrets: {
            token: 'token',
          },
          config: {
            url: d3securitySimulatorURL,
          },
        })
        .expect(403, {
          statusCode: 403,
          error: 'Forbidden',
          message:
            'Action type .d3security is disabled because your basic license does not support it. Please upgrade your license.',
        });
    });

    after(() => {
        d3securityServer.close();
    });
  });
}
