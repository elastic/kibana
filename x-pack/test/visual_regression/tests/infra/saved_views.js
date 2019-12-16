/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DATES } from '../../../functional/apps/infra/constants';
const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default function({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'infraHome', 'infraMetricExplorer']);
  const visualTesting = getService('visualTesting');
  const esArchiver = getService('esArchiver');

  describe('saved views', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));
    describe('Inverntory Test save functionality', () => {
      it('should have save and load controls', async () => {
        await PageObjects.common.navigateToApp('infraOps');
        await PageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await PageObjects.infraHome.getSaveViewButton();
        await PageObjects.infraHome.getLoadViewsButton();
        await visualTesting.snapshot();
      });

      it('should open flyout list', async () => {
        await PageObjects.infraHome.openSaveViewsFlyout();
        await visualTesting.snapshot();
        await PageObjects.infraHome.closeSavedViewFlyout();
      });

      it('should open saved view modal', async () => {
        await PageObjects.infraHome.openCreateSaveViewModal();
        await visualTesting.snapshot();
      });

      it('should be able to enter a view name', async () => {
        await PageObjects.infraHome.openEnterViewNameAndSave();
        await visualTesting.snapshot();
      });

      it('should see a saved view in list', async () => {
        await PageObjects.infraHome.openSaveViewsFlyout();
        await visualTesting.snapshot();
      });
    });

    describe('Metric Explorer Test save functionality', () => {
      it('should have save and load controls', async () => {
        await PageObjects.common.navigateToApp('infraOps');
        await PageObjects.infraHome.goToMetricExplorer();
        await PageObjects.infraMetricExplorer.getSaveViewButton();
        await PageObjects.infraMetricExplorer.getLoadViewsButton();
        await visualTesting.snapshot();
      });

      it('should open flyout list', async () => {
        await PageObjects.infraMetricExplorer.openSaveViewsFlyout();
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
        await visualTesting.snapshot();
      });
    });
  });
}
