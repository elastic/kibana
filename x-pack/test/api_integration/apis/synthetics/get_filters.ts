/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS, SYNTHETICS_API_URLS } from '@kbn/synthetics-plugin/common/constants';
import expect from '@kbn/expect';
import { syntheticsMonitorType } from '@kbn/synthetics-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('getMonitorFilters', function () {
    this.tags('skipCloud');
    const kibanaServer = getService('kibanaServer');

    const supertest = getService('supertest');

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: [syntheticsMonitorType] });
    });

    beforeEach(async () => {
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
        locations: [
          {
            id: 'eu-west-01',
            label: 'Europe West',
            geo: {
              lat: 33.2343132435,
              lon: 73.2342343434,
            },
            url: 'https://example-url.com',
            isServiceManaged: true,
          },
        ],
      };

      await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
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
        locations: [{ label: 'eu-west-01', count: 1 }],
        projects: [],
        schedules: [{ label: '3', count: 1 }],
      });
    });
  });
}
