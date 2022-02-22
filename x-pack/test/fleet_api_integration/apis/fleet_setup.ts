/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const esArchiver = getService('esArchiver');

  describe('fleet_setup', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.load('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/empty_kibana');
      await esArchiver.unload('x-pack/test/functional/es_archives/fleet/empty_fleet_server');
    });
    beforeEach(async () => {
      try {
        await es.security.deleteUser({
          username: 'fleet_enroll',
        });
      } catch (e) {
        if (e.meta?.statusCode !== 404) {
          throw e;
        }
      }
      try {
        await es.security.deleteRole({
          name: 'fleet_enroll',
        });
      } catch (e) {
        if (e.meta?.statusCode !== 404) {
          throw e;
        }
      }
    });

    it('should not create a fleet_enroll role if one does not already exist', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/setup`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(apiResponse.isInitialized).to.be(true);

      try {
        await es.security.getUser({
          username: 'fleet_enroll',
        });
      } catch (e) {
        expect(e.meta?.statusCode).to.eql(404);
      }
    });

    it('should install default packages', async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: apiResponse } = await supertest
        .get(`/api/fleet/epm/packages?experimental=true`)
        .expect(200);
      const installedPackages = apiResponse.response
        .filter((p: any) => p.status === 'installed')
        .map((p: any) => p.name)
        .sort();

      expect(installedPackages).to.eql(['endpoint']);
    });
  });
}
