/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { PingsResponseType } from '../../../../../plugins/uptime/common/runtime_types';
import { FtrProviderContext } from '../../../ftr_provider_context';

function decodePingsResponseData(response: any) {
  const decoded = PingsResponseType.decode(response);
  if (isLeft(decoded)) {
    throw Error(JSON.stringify(PathReporter.report(decoded), null, 2));
  }
  return decoded.right;
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('pingList query', () => {
    before('load heartbeat data', () => getService('esArchiver').load('uptime/full_heartbeat'));
    after('unload heartbeat index', () => getService('esArchiver').unload('uptime/full_heartbeat'));

    it('returns a list of pings for the given date range and default size', async () => {
      const from = '2019-01-28T17:40:08.078Z';
      const to = '2025-01-28T19:00:16.078Z';

      const apiResponse = await supertest.get(`/api/uptime/pings?from=${from}&to=${to}&size=10`);

      const { total, locations, pings } = decodePingsResponseData(apiResponse.body);

      expect(total).to.be(2000);
      expect(locations).to.eql(['mpls']);
      expect(pings).length(10);
      expect(pings.map(({ monitor: { id } }) => id)).to.eql([
        '0074-up',
        '0073-up',
        '0099-up',
        '0098-up',
        '0075-intermittent',
        '0097-up',
        '0049-up',
        '0047-up',
        '0077-up',
        '0076-up',
      ]);
    });

    it('returns a list of pings for the date range and given size', async () => {
      const from = '2019-01-28T17:40:08.078Z';
      const to = '2025-01-28T19:00:16.078Z';
      const size = 50;

      const apiResponse = await supertest.get(
        `/api/uptime/pings?from=${from}&to=${to}&size=${size}`
      );

      const { total, locations, pings } = decodePingsResponseData(apiResponse.body);

      expect(total).to.be(2000);
      expect(locations).to.eql(['mpls']);
      expect(pings).length(50);
      expect(pings.map(({ monitor: { id } }) => id)).to.eql([
        '0074-up',
        '0073-up',
        '0099-up',
        '0098-up',
        '0075-intermittent',
        '0097-up',
        '0049-up',
        '0047-up',
        '0077-up',
        '0076-up',
        '0050-down',
        '0048-up',
        '0072-up',
        '0096-up',
        '0092-up',
        '0069-up',
        '0093-up',
        '0070-down',
        '0071-up',
        '0095-up',
        '0032-up',
        '0094-up',
        '0046-up',
        '0091-up',
        '0067-up',
        '0068-up',
        '0090-intermittent',
        '0031-up',
        '0066-up',
        '0084-up',
        '0083-up',
        '0041-up',
        '0045-intermittent',
        '0042-up',
        '0030-intermittent',
        '0063-up',
        '0061-up',
        '0065-up',
        '0062-up',
        '0026-up',
        '0085-up',
        '0025-up',
        '0088-up',
        '0089-up',
        '0087-up',
        '0028-up',
        '0086-up',
        '0064-up',
        '0029-up',
        '0044-up',
      ]);
    });

    it('returns a list of pings for a monitor ID', async () => {
      const from = '2019-01-28T17:40:08.078Z';
      const to = '2025-01-28T19:00:16.078Z';
      const monitorId = '0001-up';
      const size = 15;

      const apiResponse = await supertest.get(
        `/api/uptime/pings?from=${from}&to=${to}&monitorId=${monitorId}&size=${size}`
      );

      const { total, locations, pings } = decodePingsResponseData(apiResponse.body);

      expect(total).to.be(20);
      expect(locations).to.eql(['mpls']);
      pings.forEach(({ monitor: { id } }) => expect(id).to.eql('0001-up'));
      expect(pings.map(({ timestamp }) => timestamp)).to.eql([
        '2019-09-11T03:40:34.371Z',
        '2019-09-11T03:40:04.370Z',
        '2019-09-11T03:39:34.370Z',
        '2019-09-11T03:39:04.371Z',
        '2019-09-11T03:38:34.370Z',
        '2019-09-11T03:38:04.370Z',
        '2019-09-11T03:37:34.370Z',
        '2019-09-11T03:37:04.370Z',
        '2019-09-11T03:36:34.371Z',
        '2019-09-11T03:36:04.370Z',
        '2019-09-11T03:35:34.373Z',
        '2019-09-11T03:35:04.371Z',
        '2019-09-11T03:34:34.371Z',
        '2019-09-11T03:34:04.381Z',
        '2019-09-11T03:33:34.371Z',
      ]);
    });

    it('returns a list of pings sorted ascending', async () => {
      const from = '2019-01-28T17:40:08.078Z';
      const to = '2025-01-28T19:00:16.078Z';
      const monitorId = '0001-up';
      const size = 5;
      const sort = 'asc';

      const apiResponse = await supertest.get(
        `/api/uptime/pings?from=${from}&to=${to}&monitorId=${monitorId}&size=${size}&sort=${sort}`
      );

      const { total, locations, pings } = decodePingsResponseData(apiResponse.body);

      expect(total).to.be(20);
      expect(locations).to.eql(['mpls']);
      expect(pings.map(({ timestamp }) => timestamp)).to.eql([
        '2019-09-11T03:31:04.380Z',
        '2019-09-11T03:31:34.366Z',
        '2019-09-11T03:32:04.372Z',
        '2019-09-11T03:32:34.375Z',
        '2019-09-11T03:33:04.370Z',
      ]);
    });
  });
}
