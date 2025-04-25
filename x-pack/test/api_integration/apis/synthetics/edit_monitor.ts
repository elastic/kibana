/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import moment from 'moment';
import { v4 as uuidv4 } from 'uuid';
import {
  ConfigKey,
  EncryptedSyntheticsSavedMonitor,
  MonitorFields,
} from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from './services/private_location_test_service';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('EditMonitorAPI', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');
    const security = getService('security');
    const kibanaServer = getService('kibanaServer');

    const testPrivateLocations = new PrivateLocationTestService(getService);
    const monitorTestService = new SyntheticsMonitorTestService(getService);

    let testPolicyId = '';

    const saveMonitor = async (monitor: MonitorFields, spaceId?: string) => {
      const apiURL = spaceId
        ? `/s/${spaceId}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`
        : SYNTHETICS_API_URLS.SYNTHETICS_MONITORS;
      const res = await supertest
        .post(apiURL + '?internal=true')
        .set('kbn-xsrf', 'true')
        .send(monitor);

      expect(res.status).eql(200, JSON.stringify(res.body));

      const { url, created_at: createdAt, updated_at: updatedAt, ...rest } = res.body;

      expect([createdAt, updatedAt].map((d) => moment(d).isValid())).eql([true, true]);

      return rest as EncryptedSyntheticsSavedMonitor;
    };

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await supertest.post('/api/fleet/setup').set('kbn-xsrf', 'true').send().expect(200);
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const loc = await testPrivateLocations.addPrivateLocation();
      testPolicyId = loc.id;
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it.skip('handles private location errors and does not update the monitor if integration policy is unable to be updated', async () => {
      const name = 'Monitor with private location';
      const newMonitor = {
        name,
        type: 'http',
        urls: 'https://elastic.co',
        locations: [
          {
            id: 'us_central',
            label: 'Europe West',
            isServiceManaged: true,
          },
          { id: testPolicyId, label: 'Private location', isServiceManaged: false },
        ],
      };

      const username = 'admin';
      const roleName = `synthetics_admin`;
      const password = `${username}-password`;
      const SPACE_ID = `test-space-${uuidv4()}`;
      const SPACE_NAME = `test-space-name ${uuidv4()}`;
      let monitorId = '';

      try {
        await kibanaServer.spaces.create({ id: SPACE_ID, name: SPACE_NAME });

        // use a user without fleet permissions to cause an error
        await security.role.create(roleName, {
          kibana: [
            {
              feature: {
                uptime: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });
        await security.user.create(username, {
          password,
          roles: [roleName],
          full_name: 'a kibana user',
        });
        const savedMonitor = await saveMonitor(newMonitor as MonitorFields);
        monitorId = savedMonitor[ConfigKey.CONFIG_ID];
        const toUpdate = {
          ...savedMonitor,
          name: '!@#$%^&*()_++[\\-\\]- wow',
          urls: 'https://google.com',
        };
        await supertestWithoutAuth
          .put(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .auth(username, password)
          .set('kbn-xsrf', 'true')
          .send(toUpdate)
          .expect(500);

        const response = await monitorTestService.getMonitor(monitorId);

        // ensure monitor was not updated
        expect(response.body.urls).not.eql(toUpdate.urls);
        expect(response.body.urls).eql(newMonitor.urls);
        expect(response.body.locations).eql(newMonitor.locations);
      } finally {
        await security.user.delete(username);
        await security.role.delete(roleName);
        await supertest
          .delete(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS + '/' + monitorId)
          .set('kbn-xsrf', 'true')
          .expect(200);
      }
    });
  });
}
