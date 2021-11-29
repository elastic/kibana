/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { API_URLS } from '../../../../../plugins/uptime/common/constants';

export default function ({ getService }: FtrProviderContext) {
  describe('get synthetics monitor', () => {
    const newMonitor = {
      type: 'http',
      name: 'Test monitor',
      urls: 'https://www.elastic.co',
    };

    const addMonitor = async () => {
      const res = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);
      return res.body.id;
    };

    const supertest = getService('supertest');

    it('get all monitors', async () => {
      const id1 = await addMonitor();
      const id2 = await addMonitor();

      const apiResponse = await supertest.get(API_URLS.SYNTHETICS_MONITORS);

      const monitor1 = apiResponse.body.saved_objects.find((obj: any) => obj.id === id1);
      const monitor2 = apiResponse.body.saved_objects.find((obj: any) => obj.id === id2);

      expect(monitor1.id).eql(id1);
      expect(monitor2.id).eql(id2);
    });

    it('get monitor by id', async () => {
      const monitorId = await addMonitor();

      const apiResponse = await supertest.get(API_URLS.SYNTHETICS_MONITORS + '/' + monitorId);

      expect(apiResponse.body.id).eql(monitorId);
    });
  });
}
