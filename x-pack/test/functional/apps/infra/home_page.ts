/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const pageObjects = getPageObjects(['common', 'infraHome', 'infraSavedViews']);

  // Failing: See https://github.com/elastic/kibana/issues/164452
  describe.skip('Home page', function () {
    this.tags('includeFirefox');
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/empty_kibana');
    });

    describe('without metrics present', () => {
      before(
        async () =>
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs')
      );

      it('renders an empty data prompt', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.getNoMetricsIndicesPrompt();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/164171
    describe.skip('with metrics present', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });
      after(
        async () =>
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs')
      );

      it('renders the waffle map and tooltips for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.getWaffleMapTooltips();
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });
    });

    describe('alerts flyouts', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
      });
      after(
        async () =>
          await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs')
      );

      it('should open and close inventory alert flyout', async () => {
        await pageObjects.infraHome.openInventoryAlertFlyout();
        await pageObjects.infraHome.closeAlertFlyout();
      });

      it('should open and close inventory alert flyout', async () => {
        await pageObjects.infraHome.openMetricsThresholdAlertFlyout();
        await pageObjects.infraHome.closeAlertFlyout();
      });

      it('should open and close alerts popover using button', async () => {
        await pageObjects.infraHome.clickAlertsAndRules();
        await pageObjects.infraHome.ensurePopoverOpened();
        await pageObjects.infraHome.clickAlertsAndRules();
        await pageObjects.infraHome.ensurePopoverClosed();
      });
    });

    // FLAKY: https://github.com/elastic/kibana/issues/106650
    describe.skip('Saved Views', () => {
      before(() => esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));
      it('should have save and load controls', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraSavedViews.getSavedViewsButton();
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should open popover', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should create new saved view and load it', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.clickSaveNewViewButton();
        await pageObjects.infraSavedViews.getCreateSavedViewModal();
        await pageObjects.infraSavedViews.createNewSavedView('view1');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
      });

      it('should new views should be listed in the load views list', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.clickLoadViewButton();
        await pageObjects.infraSavedViews.ensureViewIsLoadable('view1');
        await pageObjects.infraSavedViews.closeSavedViewsLoadModal();
      });
    });
  });
};
