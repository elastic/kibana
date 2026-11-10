/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { omit } from 'lodash';
import expect from '@kbn/expect';
import type { HTTPFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import {
  PrivateLocationTestService,
  cleanSyntheticsTestData,
} from './services/private_location_test_service';

const ELASTIC_MANAGED_LOCATIONS_DISABLED =
  "You don't have permission to use Elastic managed global locations. Please contact your Kibana administrator.";

const LOCAL_PUBLIC_LOCATION = {
  geo: { lat: 0, lon: 0 },
  id: 'dev',
  label: 'Dev Service',
  isServiceManaged: true,
};

const USERS = {
  ALL: { uptime: ['all'] },
  READ_WITH_RUN: { uptime: ['read', 'can_run_test_manually'] },
  // Writer whose admin turned off the `elastic_managed_locations_enabled` sub-feature.
  ALL_WITHOUT_MANAGED_LOCATIONS: { uptime: ['minimal_all'] },
} as const;

type UserKey = keyof typeof USERS;

/**
 * Manual runs on Elastic managed locations also require the `elastic_managed_locations_enabled`
 * sub-feature, matching the UI, which disables "Run test manually" for such monitors without it.
 * Monitors on private locations only are not affected.
 */
export default function ({ getService }: FtrProviderContext) {
  describe('RunTestManuallyPermissions - Elastic managed locations', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);

    const password = 'run-test-manually-password';
    const getUsername = (key: UserKey) => `run_test_manually_${key.toLowerCase()}`;

    let managedMonitor: Record<string, unknown>;
    let privateMonitorId: string;

    const saveMonitorInternal = async (monitor: Partial<HTTPFields>) => {
      const res = await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '?internal=true')
        .set('kbn-xsrf', 'true')
        .send(monitor);
      expect(res.status).to.eql(200, JSON.stringify(res.body));
      return omit(res.body, ['created_at', 'updated_at']);
    };

    const testNowAs = (key: UserKey, monitorId: string) =>
      supertestWithoutAuth
        .post(`${SYNTHETICS_API_URLS.TEST_NOW_MONITOR}/${monitorId}`)
        .auth(getUsername(key), password)
        .set('kbn-xsrf', 'true')
        .send();

    const runOnceAs = (key: UserKey, monitor: Record<string, unknown>) =>
      supertestWithoutAuth
        .post(`${SYNTHETICS_API_URLS.RUN_ONCE_MONITOR}/${uuidv4()}`)
        .auth(getUsername(key), password)
        .set('kbn-xsrf', 'true')
        .send(monitor);

    before(async () => {
      await cleanSyntheticsTestData(kibanaServer);
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);

      for (const key of Object.keys(USERS) as UserKey[]) {
        const username = getUsername(key);
        await security.role.create(username, {
          kibana: [{ feature: { ...USERS[key] }, spaces: ['*'] }],
        });
        await security.user.create(username, {
          password,
          roles: [username],
          full_name: 'a kibana user',
        });
      }

      const httpMonitor: HTTPFields = getFixtureJson('http_monitor');
      const privateLocation = await testPrivateLocations.createPrivateLocation();

      managedMonitor = await saveMonitorInternal({
        ...httpMonitor,
        name: `managed location monitor ${uuidv4()}`,
        locations: [LOCAL_PUBLIC_LOCATION],
      });
      const privateMonitor = await saveMonitorInternal({
        ...httpMonitor,
        name: `private location monitor ${uuidv4()}`,
        locations: [privateLocation],
      });
      privateMonitorId = privateMonitor.id;
    });

    after(async () => {
      for (const key of Object.keys(USERS) as UserKey[]) {
        const username = getUsername(key);
        await security.user.delete(username);
        await security.role.delete(username);
      }
      await cleanSyntheticsTestData(kibanaServer);
    });

    it('read + can_run_test_manually role cannot run a monitor on managed locations (403)', async () => {
      const res = await testNowAs('READ_WITH_RUN', managedMonitor.id as string);
      expect(res.status).to.eql(403, JSON.stringify(res.body));
      expect(res.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);
    });

    it('read + can_run_test_manually role can run a private-location-only monitor', async () => {
      const res = await testNowAs('READ_WITH_RUN', privateMonitorId);
      expect(res.status).to.eql(200, JSON.stringify(res.body));
      expect(typeof res.body.testRunId).to.eql('string');
    });

    it('writer without the managed locations sub-feature cannot run it (403)', async () => {
      const res = await testNowAs('ALL_WITHOUT_MANAGED_LOCATIONS', managedMonitor.id as string);
      expect(res.status).to.eql(403, JSON.stringify(res.body));
      expect(res.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);
    });

    it('base `all` role can run a monitor on managed locations', async () => {
      const res = await testNowAs('ALL', managedMonitor.id as string);
      expect(res.status).to.eql(200, JSON.stringify(res.body));
      expect(typeof res.body.testRunId).to.eql('string');
    });

    it('run once (monitor editor) is also gated on managed locations', async () => {
      const denied = await runOnceAs('ALL_WITHOUT_MANAGED_LOCATIONS', managedMonitor);
      expect(denied.status).to.eql(403, JSON.stringify(denied.body));
      expect(denied.body.message).to.eql(ELASTIC_MANAGED_LOCATIONS_DISABLED);

      const allowed = await runOnceAs('ALL', managedMonitor);
      expect(allowed.status).to.eql(200, JSON.stringify(allowed.body));
    });
  });
}
