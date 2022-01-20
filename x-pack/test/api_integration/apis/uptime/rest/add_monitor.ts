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
  describe('add synthetics monitor', () => {
    const supertest = getService('supertest');
    const newMonitor = {
      type: 'http',
      name: 'Test monitor',
      urls: 'https://www.elastic.co',
    };

    it('returns the newly added monitor', async () => {
      const apiResponse = await supertest
        .post(API_URLS.SYNTHETICS_MONITORS)
        .set('kbn-xsrf', 'true')
        .send(newMonitor);

      expect(apiResponse.body.attributes).eql(newMonitor);
    });
  });
}
