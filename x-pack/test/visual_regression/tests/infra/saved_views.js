/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DATES } from '../../../functional/apps/infra/constants';
const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'header', 'infraHome', 'infraMetricExplorer', 'timePicker']);
  const visualTesting = getService('visualTesting');
  const esArchiver = getService('esArchiver');
  const find = getService('find');

  describe('saved views', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    describe('Inventory Test save functionality', () => {
      before(async function () {
        await PageObjects.common.navigateToApp('infraOps');
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
      });

      it('should have save and load controls', async () => {
        await PageObjects.infraHome.getSaveViewButton();
        await PageObjects.infraHome.getLoadViewsButton();
        await visualTesting.snapshot();
      });

      it('should open flyout list', async () => {
        await PageObjects.infraHome.openSaveViewsFlyout();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
        await visualTesting.snapshot();
        await PageObjects.infraHome.closeSavedViewFlyout();
      });

      it('should open saved view modal', async () => {
        await PageObjects.infraHome.openCreateSaveViewModal();
        await visualTesting.snapshot();
      });

      it('should be able to enter a view name', async () => {
        await PageObjects.infraHome.openEnterViewNameAndSave();
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await visualTesting.snapshot();
      });

      it('should see a saved view in list', async () => {
        await PageObjects.infraHome.openSaveViewsFlyout();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
        await visualTesting.snapshot();
      });
    });

    describe('Metric Explorer Test save functionality', () => {
      const fromTime = 'Oct 16, 2018 @ 00:00:00.000';
      const toTime =   'Oct 18, 2018 @ 00:00:00.000';

      before(async function () {
        await PageObjects.common.navigateToApp('infraOps');
        await PageObjects.infraHome.goToMetricExplorer();
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
        await PageObjects.header.awaitGlobalLoadingIndicatorHidden();
        await PageObjects.infraHome.waitForChartToLoad();
      });

      it('should have save and load controls', async () => {
        await PageObjects.infraMetricExplorer.getSaveViewButton();
        await PageObjects.infraMetricExplorer.getLoadViewsButton();
        await visualTesting.snapshot();
      });

      it('should open flyout list', async () => {
        await PageObjects.infraMetricExplorer.openSaveViewsFlyout();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
        await visualTesting.snapshot();
        await PageObjects.infraMetricExplorer.closeSavedViewFlyout();
      });

      it('should open saved view modal', async () => {
        await PageObjects.infraMetricExplorer.openCreateSaveViewModal();
        await visualTesting.snapshot();
      });

      it('should be able to enter a view name', async () => {
        await PageObjects.infraMetricExplorer.openEnterViewNameAndSave();
        await visualTesting.snapshot();
      });

      it('should see a saved view in list', async () => {
        await PageObjects.infraMetricExplorer.openSaveViewsFlyout();
        await find.waitForDeletedByCssSelector('.euiBasicTable-loading', 5000);
        await visualTesting.snapshot();
      });
    });
  });
}
