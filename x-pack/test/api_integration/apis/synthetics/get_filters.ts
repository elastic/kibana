/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';

export const LOCAL_LOCATION = {
  id: 'dev',
  label: 'Dev Service',
  geo: {
    lat: 0,
    lon: 0,
  },
  isServiceManaged: true,
};
export default function ({ getService }: FtrProviderContext) {
  describe('getMonitorFilters', function () {
    this.tags('skipCloud');
    const kibanaServer = getService('kibanaServer');

    const supertest = getService('supertest');

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
    });

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
    });

    it('get list of filters', async () => {
      const apiResponse = await supertest.get(SYNTHETICS_API_URLS.FILTERS).expect(200);

      expect(apiResponse.body).eql({
        monitorTypes: [],
        tags: [],
        locations: [],
        projects: [],
        schedules: [],
      });
    });

    it('get list of filters with monitorTypes', async () => {
      const newMonitor = {
        name: 'Sample name',
        type: 'http',
        urls: 'https://elastic.co',
        tags: ['apm', 'synthetics'],
        locations: [LOCAL_LOCATION],
      };

      await supertest
        .post(SYNTHETICS_API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor)
        .expect(200);

      const apiResponse = await supertest.get(SYNTHETICS_API_URLS.FILTERS).expect(200);

      expect(apiResponse.body).eql({
        monitorTypes: [{ label: 'http', count: 1 }],
        tags: [
          { label: 'apm', count: 1 },
          { label: 'synthetics', count: 1 },
        ],
        locations: [{ label: 'dev', count: 1 }],
        projects: [],
        schedules: [{ label: '3', count: 1 }],
      });
    });
  });
}
