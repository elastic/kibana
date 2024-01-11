/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for stack monitoring
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'spaceSelector', 'home', 'header', 'security']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const noData = getService('monitoringNoData');
  const kibanaOverview = getService('monitoringKibanaOverview');
  const clusterOverview = getService('monitoringClusterOverview');

  describe('Kibana Stack Monitoring a11y tests', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('monitoring');
      await a11y.testAppSnapshot();
    });

    it('a11y tests for no monitoring data found page', async () => {
      await noData.isOnNoDataPage();
      await a11y.testAppSnapshot();
    });

    it('a11y tests for self monitoring home page', async function () {
      await noData.enableMonitoring();
      await a11y.testAppSnapshot();
      await retry.waitForWithTimeout('alert button to be visible', 30000, async () => {
        return await testSubjects.isDisplayed('alerts-modal-remind-later-button');
      });
    });

    // a11y violation caught here - if this rest is unskipped remove the test below it.
    // https://github.com/elastic/kibana/issues/134139
    it.skip('a11y tests for Alerts modal remind later button', async function () {
      await testSubjects.click('alerts-modal-remind-later-button');
      await a11y.testAppSnapshot();
    });

    it('Alerts Page', async function () {
      await testSubjects.click('alerts-modal-remind-later-button');
    });

    it('a11y tests for Kibana Overview', async function () {
      await clusterOverview.clickKibanaOverview();
      expect(await kibanaOverview.isOnOverview()).to.be(true);
      await retry.try(async () => {
        await a11y.testAppSnapshot();
      });
    });

    it('a11y tests for Kibana Instances Page', async function () {
      await kibanaOverview.isOnOverview();
      await retry.waitForWithTimeout(
        'Make sure Kibana instances tab is visble',
        30000,
        async () => {
          return await testSubjects.isDisplayed('kibanaInstancesPage');
        }
      );
      await kibanaOverview.clickInstanceTab();
      await a11y.testAppSnapshot();
    });
  });
}
