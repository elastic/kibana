/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { deleteUptimeSettingsObject } from '../../../functional/apps/uptime';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  describe('uptime simple status alert', () => {
    const pageObjects = getPageObjects(['common', 'header', 'uptime']);
    const server = getService('kibanaServer');
    const uptimeService = getService('uptime');
    const retry = getService('retry');
    const supertest = getService('supertest');

    const testSubjects = getService('testSubjects');

    const monitorId = '0000-intermittent';

    const uptime = getService('uptime');

    const DEFAULT_DATE_START = 'Sep 10, 2019 @ 12:40:08.078';
    const DEFAULT_DATE_END = 'Sep 11, 2019 @ 19:40:08.078';

    before(async () => {
      // delete the saved object
      await deleteUptimeSettingsObject(server);

      await uptime.navigation.goToUptime();

      await pageObjects.uptime.goToUptimeOverviewAndLoadData(DEFAULT_DATE_START, DEFAULT_DATE_END);
    });

    beforeEach(async () => {
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('displays to define default connector', async () => {
      await testSubjects.click('uptimeDisplayDefineConnector');
      await testSubjects.existOrFail('uptimeSettingsDefineConnector');
    });

    it('go to settings to define connector', async () => {
      await testSubjects.click('uptimeSettingsLink');
      await uptimeService.common.waitUntilDataIsLoaded();
      await testSubjects.existOrFail('comboBoxInput');
    });

    it('define default connector', async () => {
      await testSubjects.click('comboBoxInput');
      await testSubjects.click('Slack#xyztest');
      await testSubjects.click('apply-settings-button');
      await uptimeService.navigation.goToUptime();
    });

    it('enable simple status alert', async () => {
      await pageObjects.uptime.goToUptimeOverviewAndLoadData(DEFAULT_DATE_START, DEFAULT_DATE_END);
      await testSubjects.click('uptimeEnableSimpleDownAlert' + monitorId);
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('displays relevant alert in list drawer', async () => {
      await testSubjects.click(`xpack.uptime.monitorList.${monitorId}.expandMonitorDetail`);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('uptimeMonitorListDrawerAlert0');
    });

    it('has created a valid simple alert with expected parameters', async () => {
      let alert: any;
      await retry.tryForTime(15000, async () => {
        const apiResponse = await supertest.get(`/api/alerts/_find?search=Simple status alert`);
        const alertsFromThisTest = apiResponse.body.data.filter(({ params }: { params: any }) =>
          params.search.includes(monitorId)
        );
        expect(alertsFromThisTest).to.have.length(1);
        alert = alertsFromThisTest[0];
      });

      const { actions, alertTypeId, consumer, id, tags } = alert ?? {};
      try {
        expect(actions).to.eql([
          {
            actionTypeId: '.slack',
            group: 'xpack.uptime.alerts.actionGroups.monitorStatus',
            id: 'my-slack1',
            params: {
              message:
                'Monitor {{state.monitorName}} with url {{{state.monitorUrl}}} is {{state.statusMessage}} from {{state.observerLocation}}. The latest error message is {{{state.latestErrorMessage}}}',
            },
          },
        ]);
        expect(alertTypeId).to.eql('xpack.uptime.alerts.monitorStatus');
        expect(consumer).to.eql('uptime');
        expect(tags).to.eql(['UPTIME_AUTO']);
      } catch (e) {
        await supertest.delete(`/api/alerts/alert/${id}`).set('kbn-xsrf', 'true').expect(204);
      }
    });

    it('disable simple status alert', async () => {
      await testSubjects.click('uptimeDisableSimpleDownAlert' + monitorId);
      await pageObjects.header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('uptimeEnableSimpleDownAlert' + monitorId);
    });
  });
};
