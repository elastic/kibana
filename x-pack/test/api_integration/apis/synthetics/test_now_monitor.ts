/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorFields } from '@kbn/synthetics-plugin/common/runtime_types';
import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';
import { SyntheticsMonitorTestService } from './services/synthetics_monitor_test_service';

export default function ({ getService }: FtrProviderContext) {
  describe('RunTestManually', function () {
    this.tags('skipCloud');

    const supertest = getService('supertest');
    const supertestWithoutAuth = getService('supertestWithoutAuth');

    const monitorTestService = new SyntheticsMonitorTestService(getService);
    const kibanaServer = getService('kibanaServer');

    let newMonitor: MonitorFields;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await supertest
        .put(SYNTHETICS_API_URLS.SYNTHETICS_ENABLEMENT)
        .set('kbn-xsrf', 'true')
        .expect(200);
      newMonitor = getFixtureJson('http_monitor');
    });

    it('runs test manually', async () => {
      const resp = await monitorTestService.addMonitor(newMonitor);

      const res = await supertest
        .get(SYNTHETICS_API_URLS.TRIGGER_MONITOR + `/${resp.id}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const result = res.body;
      expect(typeof result.testRunId).to.eql('string');
      expect(typeof result.configId).to.eql('string');
      expect(result.schedule).to.eql({ number: '5', unit: 'm' });
      expect(result.locations).to.eql([
        {
          id: 'eu-west-01',
          label: 'Europe East',
          geo: { lat: 33.2343132435, lon: 73.2342343434 },
          url: 'https://example-url.com',
          isServiceManaged: true,
        },
        {
          id: 'eu-west-02',
          label: 'Europe West',
          geo: { lat: 33.2343132435, lon: 73.2342343434 },
          url: 'https://example-url.com',
          isServiceManaged: true,
        },
      ]);

      expect(omit(result.monitor, ['id', 'config_id'])).to.eql(
        omit(newMonitor, ['id', 'config_id'])
      );
    });

    it('works in non default space', async () => {
      const { username, SPACE_ID, password } = await monitorTestService.addsNewSpace();

      const resp = await supertestWithoutAuth
        .post(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.SYNTHETICS_MONITORS}`)
        .auth(username, password)
        .set('kbn-xsrf', 'true')
        .send(newMonitor)
        .expect(200);

      const res = await supertest
        .get(`/s/${SPACE_ID}${SYNTHETICS_API_URLS.TRIGGER_MONITOR}/${resp.body.id}`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      const result = res.body;
      expect(typeof result.testRunId).to.eql('string');
      expect(typeof result.configId).to.eql('string');
      expect(result.schedule).to.eql({ number: '5', unit: 'm' });
      expect(result.locations).to.eql([
        {
          id: 'eu-west-01',
          label: 'Europe East',
          geo: { lat: 33.2343132435, lon: 73.2342343434 },
          url: 'https://example-url.com',
          isServiceManaged: true,
        },
        {
          id: 'eu-west-02',
          label: 'Europe West',
          geo: { lat: 33.2343132435, lon: 73.2342343434 },
          url: 'https://example-url.com',
          isServiceManaged: true,
        },
      ]);

      expect(omit(result.monitor, ['id', 'config_id'])).to.eql(
        omit(newMonitor, ['id', 'config_id'])
      );
    });
  });
}
