/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// a11y tests for spaces, space selection and space creation and feature controls

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'spaceSelector', 'home', 'header', 'security']);
  const a11y = getService('a11y');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const noData = getService('monitoringNoData');
  const kibanaOverview = getService('monitoringKibanaOverview');
  const kibanaInstances = getService('monitoringKibanaInstances');
  const clusterOverview = getService('monitoringClusterOverview');

  describe('Kibana Stack Monitoring', () => {
    before(async () => {
      await PageObjects.common.navigateToApp('monitoring');
      await a11y.testAppSnapshot();
    });

    it('No monitoring data found should exist ', async () => {
      await noData.isOnNoDataPage();
      await a11y.testAppSnapshot();
    });

    it('Enable Monitoring', async function () {
      await noData.enableMonitoring();
      await a11y.testAppSnapshot();
      await retry.waitForWithTimeout('alert button to be visible', 30000, async () => {
        return await testSubjects.isDisplayed('alerts-modal-remind-later-button');
      });
    });

    // a11y violation caught here - if this rest is unskipped remove the test below it.
    // https://github.com/elastic/kibana/issues/134139
    it.skip('Alerts Page', async function () {
      await testSubjects.click('alerts-modal-remind-later-button');
      await a11y.testAppSnapshot();
    });

    it('Alerts Page', async function () {
      await testSubjects.click('alerts-modal-remind-later-button');
    });

    it('Kibana Overview', async function () {
      await clusterOverview.clickKibanaOverview();
      await kibanaOverview.isOnOverview();
      await a11y.testAppSnapshot();
    });

    it('Kibana Instances Page', async function () {
      await kibanaOverview.isOnOverview();
      await kibanaOverview.clickInstanceTab();
      await a11y.testAppSnapshot();
    });
  });
}
