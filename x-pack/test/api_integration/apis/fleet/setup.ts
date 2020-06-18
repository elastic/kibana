/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('fleet_setup', () => {
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
        .post(`/api/ingest_manager/fleet/setup`)
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
            names: [
              'logs-*',
              'metrics-*',
              'events-*',
              '.ds-logs-*',
              '.ds-metrics-*',
              '.ds-events-*',
            ],
            privileges: ['write', 'create_index', 'indices:admin/auto_create'],
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
      await supertest.post(`/api/ingest_manager/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseFirstTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      await supertest.post(`/api/ingest_manager/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseSecondTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      expect(userResponseFirstTime.fleet_enroll.metadata.updated_at).to.be(
        userResponseSecondTime.fleet_enroll.metadata.updated_at
      );
    });

    it('should create or update the fleet_enroll user if called multiple times with forceRecreate flag', async () => {
      await supertest.post(`/api/ingest_manager/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      const { body: userResponseFirstTime } = await es.security.getUser({
        username: 'fleet_enroll',
      });

      await supertest
        .post(`/api/ingest_manager/fleet/setup`)
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
