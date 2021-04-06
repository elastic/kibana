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

  describe('fleet_agents_setup', () => {
    skipIfNoDockerRegistry(providerContext);
    before(async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.load('fleet/empty_fleet_server');
    });

    after(async () => {
      await esArchiver.unload('empty_kibana');
      await esArchiver.load('fleet/empty_fleet_server');
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

    it('should create a fleet_enroll user and role', async () => {
      const { body: apiResponse } = await supertest
        .post(`/api/fleet/agents/setup`)
        .set('kbn-xsrf', 'xxxx')
        .expect(200);

      expect(apiResponse.isInitialized).to.be(true);

      const { body: userResponse } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      expect(userResponse).to.have.key('fleet_enroll');
      expect(userResponse.fleet_enroll.roles).to.eql(['fleet_enroll']);

      const { body: roleResponse } = await es.security.getRole({
        name: 'fleet_enroll',
      });
      expect(roleResponse).to.have.key('fleet_enroll');
      expect(roleResponse.fleet_enroll).to.eql({
        cluster: ['monitor', 'manage_api_key'],
        indices: [
          {
            names: ['logs-*', 'metrics-*', 'traces-*', '.logs-endpoint.diagnostic.collection-*'],
            privileges: ['auto_configure', 'create_doc'],
            allow_restricted_indices: false,
          },
        ],
        applications: [],
        run_as: [],
        metadata: {},
        transient_metadata: { enabled: true },
      });
    });

    it('should not create or update the fleet_enroll user if called multiple times', async () => {
      await supertest.post(`/api/fleet/agents/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseFirstTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      await supertest.post(`/api/fleet/agents/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseSecondTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      expect(userResponseFirstTime.fleet_enroll.metadata.updated_at).to.be(
        userResponseSecondTime.fleet_enroll.metadata.updated_at
      );
    });

    it('should create or update the fleet_enroll user if called multiple times with forceRecreate flag', async () => {
      await supertest.post(`/api/fleet/agents/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseFirstTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      await supertest
        .post(`/api/fleet/agents/setup`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          forceRecreate: true,
        })
        .expect(200);

      const { body: userResponseSecondTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      expect(userResponseFirstTime.fleet_enroll.metadata.updated_at).to.not.be(
        userResponseSecondTime.fleet_enroll.metadata.updated_at
      );
    });
  });
}
