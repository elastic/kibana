/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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

    describe('with metrics present', () => {
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
        // await pageObjects.infraHome.getWaffleMapTooltips(); see https://github.com/elastic/kibana/issues/137903
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });

      it('should not allow adding more than 20 custom metrics', async () => {
        // open
        await pageObjects.infraHome.clickCustomMetricDropdown();

        const fields = [
          'process.cpu.pct',
          'process.memory.pct',
          'system.core.total.pct',
          'system.core.user.pct',
          'system.core.nice.pct',
          'system.core.idle.pct',
          'system.core.iowait.pct',
          'system.core.irq.pct',
          'system.core.softirq.pct',
          'system.core.steal.pct',
          'system.cpu.nice.pct',
          'system.cpu.idle.pct',
          'system.cpu.iowait.pct',
          'system.cpu.irq.pct',
        ];

        for (const field of fields) {
          await pageObjects.infraHome.addCustomMetric(field);
        }
        const metricsCount = await pageObjects.infraHome.getMetricsContextMenuItemsCount();
        // there are 6 default metrics in the context menu for hosts
        expect(metricsCount).to.eql(20);

        await pageObjects.infraHome.ensureCustomMetricAddButtonIsDisabled();
        // close
        await pageObjects.infraHome.clickCustomMetricDropdown();
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

      it('should open and close metrics threshold alert flyout', async () => {
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

    describe('Saved Views', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.infraHome.goToMetricExplorer();
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
      });

      it('should have save and load controls', async () => {
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
