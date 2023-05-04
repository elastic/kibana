/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { setupFleetAndAgents } from '../agents/services';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('Settings - get', async function () {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    setupFleetAndAgents(providerContext);

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    it('should respond with fleet_server_hosts', async function () {
      // Create a fleet server host
      await supertest
        .post(`/api/fleet/fleet_server_hosts`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          id: 'test-default-123',
          name: 'Default',
          is_default: true,
          host_urls: ['https://test.com:8080', 'https://test.com:8081'],
        })
        .expect(200);

      // Assert that the hosts appear in the setting response
      const response = await supertest
        .get(`/api/fleet/settings`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(response.body.item.fleet_server_hosts).to.eql([
        'https://test.com:8080',
        'https://test.com:8081',
      ]);
    });
  });
}
