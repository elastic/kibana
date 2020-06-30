/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  // FLAKY: https://github.com/elastic/kibana/issues/65948
  describe.skip('uptime alerts', () => {
    const pageObjects = getPageObjects(['common', 'uptime']);
    const supertest = getService('supertest');
    const retry = getService('retry');

    describe('overview page alert flyout controls', function () {
      const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
      const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';
      let alerts: any;

      before(async () => {
        alerts = getService('uptime').alerts;
      });

      it('can open alert flyout', async () => {
        await pageObjects.uptime.goToUptimeOverviewAndLoadData(
          DEFAULT_DATE_START,
          DEFAULT_DATE_END
        );
        await alerts.openFlyout('monitorStatus');
      });

      it('can set alert name', async () => {
        await alerts.setAlertName('uptime-test');
      });

      it('can set alert tags', async () => {
        await alerts.setAlertTags(['uptime', 'another']);
      });

      it('can set alert interval', async () => {
        await alerts.setAlertInterval('11');
      });

      it('can set alert throttle interval', async () => {
        await alerts.setAlertThrottleInterval('30');
      });

      it('can set alert status number of time', async () => {
        await alerts.setAlertStatusNumTimes('3');
      });

      it('can set alert time range', async () => {
        await alerts.setAlertTimerangeSelection('1');
      });

      it('can set monitor hours', async () => {
        await alerts.setMonitorStatusSelectableToHours();
      });

      it('can set kuery bar filters', async () => {
        await pageObjects.uptime.setAlertKueryBarText('monitor.id: "0001-up"');
      });

      it('can select location filter', async () => {
        await alerts.clickAddFilterLocation();
        await alerts.clickLocationExpression('mpls');
      });

      it('can select port filter', async () => {
        await alerts.clickAddFilterPort();
        await alerts.clickPortExpression('5678');
      });

      it('can select type/scheme filter', async () => {
        await alerts.clickAddFilterType();
        await alerts.clickTypeExpression('http');
      });

      it('can save alert', async () => {
        await alerts.clickSaveAlertButton();
        await pageObjects.common.closeToast();
      });

      it('posts an alert, verifies its presence, and deletes the alert', async () => {
        // The creation of the alert could take some time, so the first few times we query after
        // the previous line resolves, the API may not be done creating the alert yet, so we
        // put the fetch code in a retry block with a timeout.
        let alert: any;
        await retry.tryForTime(15000, async () => {
          const apiResponse = await supertest.get('/api/alerts/_find?search=uptime-test');
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

        try {
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
            '{"bool":{"filter":[{"bool":{"should":[{"match_phrase":{"monitor.id":"0001-up"}}],' +
              '"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"match":{"observer.geo.name":"mpls"}}],' +
              '"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"match":{"url.port":5678}}],' +
              '"minimum_should_match":1}},{"bool":{"should":[{"match":{"monitor.type":"http"}}],"minimum_should_match":1}}]}}]}}]}}'
          );
        } finally {
          await supertest.delete(`/api/alerts/alert/${id}`).set('kbn-xsrf', 'true').expect(204);
        }
      });
    });

    describe('tls alert', function () {
      const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
      const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';
      let alerts: any;
      const alertId = 'uptime-tls';

      before(async () => {
        alerts = getService('uptime').alerts;
      });

      it('can open alert flyout', async () => {
        await pageObjects.uptime.goToUptimeOverviewAndLoadData(
          DEFAULT_DATE_START,
          DEFAULT_DATE_END
        );
        await alerts.openFlyout('tls');
      });

      it('can set alert name', async () => {
        await alerts.setAlertName(alertId);
      });

      it('can set alert tags', async () => {
        await alerts.setAlertTags(['uptime', 'certs']);
      });

      it('can set alert interval', async () => {
        await alerts.setAlertInterval('11');
      });

      it('can set alert throttle interval', async () => {
        await alerts.setAlertThrottleInterval('30');
      });

      it('can save alert', async () => {
        await alerts.clickSaveAlertButton();
        await pageObjects.common.closeToast();
      });

      it('has created a valid alert with expected parameters', async () => {
        let alert: any;
        await retry.tryForTime(15000, async () => {
          const apiResponse = await supertest.get(`/api/alerts/_find?search=${alertId}`);
          const alertsFromThisTest = apiResponse.body.data.filter(
            ({ name }: { name: string }) => name === alertId
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
          params,
          schedule: { interval },
          tags,
        } = alert;
        try {
          expect(actions).to.eql([]);
          expect(alertTypeId).to.eql('xpack.uptime.alerts.tls');
          expect(consumer).to.eql('uptime');
          expect(tags).to.eql(['uptime', 'certs']);
          expect(params).to.eql({});
          expect(interval).to.eql('11m');
        } finally {
          await supertest.delete(`/api/alerts/alert/${id}`).set('kbn-xsrf', 'true').expect(204);
        }
      });
    });
  });
};
