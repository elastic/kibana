/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('overview page alert flyout controls', function () {
    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';
    const pageObjects = getPageObjects(['common', 'uptime']);
    const supertest = getService('supertest');
    const retry = getService('retry');

    it('posts an alert, verfies its presence, and deletes the alert', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(DEFAULT_DATE_START, DEFAULT_DATE_END);

      await pageObjects.uptime.openAlertFlyoutAndCreateMonitorStatusAlert({
        alertInterval: '11',
        alertName: 'uptime-test',
        alertNumTimes: '3',
        alertTags: ['uptime', 'another'],
        alertThrottleInterval: '30',
        alertTimerangeSelection: '1',
        filters: 'monitor.id: "0001-up"',
      });

      // The creation of the alert could take some time, so the first few times we query after
      // the previous line resolves, the API may not be done creating the alert yet, so we
      // put the fetch code in a retry block with a timeout.
      let alert: any;
      await retry.tryForTime(15000, async () => {
        const apiResponse = await supertest.get('/api/alert/_find');
        const alertsFromThisTest = apiResponse.body.data.filter(
          ({ name }: { name: string }) => name === 'uptime-test'
        );
        expect(alertsFromThisTest).to.have.length(1);
        alert = alertsFromThisTest[0];
      });

      // Ensure the parameters and other stateful data
      // on the alert match up with the values we provided
      // for our test helper to input into the flyout.
      const {
        actions,
        alertTypeId,
        consumer,
        id,
        params: { numTimes, timerange, locations, filters },
        schedule: { interval },
        tags,
      } = alert;

      // we're not testing the flyout's ability to associate alerts with action connectors
      expect(actions).to.eql([]);

      expect(alertTypeId).to.eql('xpack.uptime.alerts.monitorStatus');
      expect(consumer).to.eql('uptime');
      expect(interval).to.eql('11m');
      expect(tags).to.eql(['uptime', 'another']);
      expect(numTimes).to.be(3);
      expect(timerange.from).to.be('now-1h');
      expect(timerange.to).to.be('now');
      expect(locations).to.eql(['mpls']);
      expect(filters).to.eql(
        '{"bool":{"should":[{"match_phrase":{"monitor.id":"0001-up"}}],"minimum_should_match":1}}'
      );

      await supertest.delete(`/api/alert/${id}`).set('kbn-xsrf', 'true').expect(204);
    });
  });
};
