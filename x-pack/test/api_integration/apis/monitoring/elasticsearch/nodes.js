/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import nodesListingFixtureGreen from './fixtures/nodes_listing_green';
import nodesListingFixtureRed from './fixtures/nodes_listing_red';
import nodesListingFixtureCgroup from './fixtures/nodes_listing_cgroup';

export default function ({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('nodes', () => {
    describe('with green platinum cluster', () => {
      const archive = 'monitoring/singlecluster-green-platinum';
      const timeRange = {
        min: '2018-02-13T17:04:50.000Z',
        max: '2018-02-13T17:51:55.000Z'
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should return data for 2 active nodes', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/fHJwISmKTFO8bj57oFBLUQ/elasticsearch/nodes'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureGreen);
      });
    });

    describe('with red platinum cluster', () => {
      const archive = 'monitoring/singlecluster-red-platinum';
      const timeRange = {
        min: '2017-10-06T19:53:06.000Z',
        max: '2017-10-06T20:15:30.000Z'
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should return data for offline nodes', async () => {
        const { body } = await supertest
          .post(
            '/api/monitoring/v1/clusters/1LYuyvCCQFS3FAO_h65PQw/elasticsearch/nodes'
          )
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureRed);
      });
    });

    describe('with green trial cluster and node in cpu group', () => {
      const archive = 'monitoring/singlecluster-green-trial-two-nodes-one-cgrouped';
      const timeRange = {
        min: '2018-02-13T19:18:02.000Z',
        max: '2018-02-13T19:26:14.000Z'
      };

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should return cpu info for cgroup node and cpu info for "regular" node', async () => {
        const { body } = await supertest
          .post('/api/monitoring/v1/clusters/Cbo7k85ZRdy--yxmqeykog/elasticsearch/nodes')
          .set('kbn-xsrf', 'xxx')
          .send({ timeRange })
          .expect(200);
        expect(body).to.eql(nodesListingFixtureCgroup);
      });
    });
  });
}
