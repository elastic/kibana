/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import expect from '@kbn/expect';
import { PINGS_DATE_RANGE_START, PINGS_DATE_RANGE_END } from './constants';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('get_all_pings', () => {
    const archive = 'uptime/pings';

    before('load heartbeat data', async () => await esArchiver.load(archive));
    after('unload heartbeat data', async () => await esArchiver.unload(archive));

    it('should get all pings stored in index', async () => {
      const { body: apiResponse } = await supertest
        .get(
          `/api/uptime/pings?sort=desc&dateRangeStart=${PINGS_DATE_RANGE_START}&dateRangeEnd=${PINGS_DATE_RANGE_END}`
        )
        .expect(200);

      expect(apiResponse.total).to.be(2);
      expect(apiResponse.pings.length).to.be(2);
      expect(apiResponse.pings[0].monitor.id).to.be('http@https://www.github.com/');
    });

    it('should sort pings according to timestamp', async () => {
      const { body: apiResponse } = await supertest
        .get(
          `/api/uptime/pings?sort=asc&dateRangeStart=${PINGS_DATE_RANGE_START}&dateRangeEnd=${PINGS_DATE_RANGE_END}`
        )
        .expect(200);

      expect(apiResponse.total).to.be(2);
      expect(apiResponse.pings.length).to.be(2);
      expect(apiResponse.pings[0].timestamp).to.be('2018-10-30T14:49:23.889Z');
      expect(apiResponse.pings[1].timestamp).to.be('2018-10-30T18:51:56.792Z');
    });

    it('should return results of n length', async () => {
      const { body: apiResponse } = await supertest
        .get(
          `/api/uptime/pings?sort=desc&size=1&dateRangeStart=${PINGS_DATE_RANGE_START}&dateRangeEnd=${PINGS_DATE_RANGE_END}`
        )
        .expect(200);

      expect(apiResponse.total).to.be(2);
      expect(apiResponse.pings.length).to.be(1);
      expect(apiResponse.pings[0].monitor.id).to.be('http@https://www.github.com/');
    });

    it('should miss pings outside of date range', async () => {
      const dateRangeStart = moment('2002-01-01').valueOf();
      const dateRangeEnd = moment('2002-01-02').valueOf();
      const { body: apiResponse } = await supertest
        .get(`/api/uptime/pings?dateRangeStart=${dateRangeStart}&dateRangeEnd=${dateRangeEnd}`)
        .expect(200);

      expect(apiResponse.total).to.be(0);
      expect(apiResponse.pings.length).to.be(0);
    });
  });
}
