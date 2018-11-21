/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get_all_pings', () => {
    const archive = 'uptime/pings';

    beforeEach('put pings in index', () => esArchiver.load(archive));
    afterEach('delete pings from index', () => esArchiver.unload(archive));

    it('should get all pings stored in index', async () => {
      const { body: apiResponse } = await supertest.get('/api/uptime_monitoring/pings').expect(200);

      expect(apiResponse.length).to.be(2);
      expect(apiResponse[0].monitor.id).to.be('http@https://www.github.com/');
    });

    it('should sort pings according to timestamp', async () => {
      const { body: apiResponse } = await supertest.get('/api/uptime_monitoring/pings?sort=asc').expect(200);

      expect(apiResponse.length).to.be(2);
      expect(apiResponse[0].timestamp).to.be('2018-10-30T14:49:23.889Z');
      expect(apiResponse[1].timestamp).to.be('2018-10-30T18:51:56.792Z');
    });

    it('should return results of n length', async () => {
      const { body: apiResponse } = await supertest.get('/api/uptime_monitoring/pings?size=1').expect(200);

      expect(apiResponse.length).to.be(1);
      expect(apiResponse[0].monitor.id).to.be('http@https://www.github.com/');
    });
  });
}
