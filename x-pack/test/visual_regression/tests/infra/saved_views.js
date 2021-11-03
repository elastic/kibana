/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATES } from '../../../functional/apps/infra/constants';
const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;

export default function ({ getPageObjects, getService }) {
  const PageObjects = getPageObjects(['common', 'infraHome', 'infraMetricsExplorer']);
  const visualTesting = getService('visualTesting');
  const esArchiver = getService('esArchiver');

  describe('saved views', () => {
    before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
    after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
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

    describe('Metric Explorer Test Saved Views', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      describe('save functionality', () => {
        it('should have saved views component', async () => {
          await PageObjects.common.navigateToApp('infraOps');
          await PageObjects.infraHome.goToMetricExplorer();
          await PageObjects.infraSavedViews.getSavedViewsButton();
          await PageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
          await visualTesting.snapshot();
        });

        it('should open popover', async () => {
          await PageObjects.infraSavedViews.clickSavedViewsButton();
          await visualTesting.snapshot();
          await PageObjects.infraSavedViews.closeSavedViewsPopover();
        });

        it('should create new saved view and load it', async () => {
          await PageObjects.infraSavedViews.clickSavedViewsButton();
          await PageObjects.infraSavedViews.clickSaveNewViewButton();
          await PageObjects.infraSavedViews.getCreateSavedViewModal();
          await PageObjects.infraSavedViews.createNewSavedView('view1');
          await PageObjects.infraSavedViews.ensureViewIsLoaded('view1');
          await visualTesting.snapshot();
        });

        it('should new views should be listed in the load views list', async () => {
          await PageObjects.infraSavedViews.clickSavedViewsButton();
          await PageObjects.infraSavedViews.clickLoadViewButton();
          await PageObjects.infraSavedViews.ensureViewIsLoadable('view1');
          await visualTesting.snapshot();
          await PageObjects.infraSavedViews.closeSavedViewsLoadModal();
        });
      });
    });
  });
}
