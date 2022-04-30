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
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'infraHome', 'infraSavedViews']);

  // Failing: See https://github.com/elastic/kibana/issues/106650
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

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });

      it('renders the waffle map and tooltips for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.getWaffleMapTooltips();
      });

      it('sort nodes by descending value', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.sortNodesBy('value');
        await retry.try(async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'demo-stack-apache-01', value: 1.4, color: '#6092c0' },
            { name: 'demo-stack-mysql-01', value: 1.2, color: '#82a7cd' },
            { name: 'demo-stack-nginx-01', value: 1.1, color: '#93b1d3' },
            { name: 'demo-stack-redis-01', value: 1, color: '#a2bcd9' },
            { name: 'demo-stack-haproxy-01', value: 0.8, color: '#c2d2e6' },
            { name: 'demo-stack-client-01', value: 0.6, color: '#f0f4f9' },
          ]);
        });
      });

      it('sort nodes by ascending value', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.sortNodesBy('value');
        await pageObjects.infraHome.toggleReverseSort();
        await retry.try(async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'demo-stack-client-01', value: 0.6, color: '#f0f4f9' },
            { name: 'demo-stack-haproxy-01', value: 0.8, color: '#c2d2e6' },
            { name: 'demo-stack-redis-01', value: 1, color: '#a2bcd9' },
            { name: 'demo-stack-nginx-01', value: 1.1, color: '#93b1d3' },
            { name: 'demo-stack-mysql-01', value: 1.2, color: '#82a7cd' },
            { name: 'demo-stack-apache-01', value: 1.4, color: '#6092c0' },
          ]);
        });
      });

      it('group nodes by custom field', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await retry.try(async () => {
          const groups = await pageObjects.infraHome.groupByCustomField('host.os.platform');
          expect(groups).to.eql(['ubuntu']);
        });
      });

      it('filter nodes by search term', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.enterSearchTerm('host.name: "demo-stack-apache-01"');
        await retry.try(async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'demo-stack-apache-01', value: 1.4, color: '#6092c0' },
          ]);
        });
        await pageObjects.infraHome.clearSearchTerm();
      });

      it('change color palette', async () => {
        await pageObjects.infraHome.openLegendControls();
        await pageObjects.infraHome.changePalette('temperature');
        await pageObjects.infraHome.applyLegendControls();
        await retry.try(async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'demo-stack-client-01', value: 0.6, color: '#6092c0' },
            { name: 'demo-stack-haproxy-01', value: 0.8, color: '#b5c9df' },
            { name: 'demo-stack-redis-01', value: 1, color: '#f1d9b9' },
            { name: 'demo-stack-nginx-01', value: 1.1, color: '#eec096' },
            { name: 'demo-stack-mysql-01', value: 1.2, color: '#eba47a' },
            { name: 'demo-stack-apache-01', value: 1.4, color: '#e7664c' },
          ]);
        });
      });

      it('toggle the timeline', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.openTimeline();
        await pageObjects.infraHome.closeTimeline();
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

    describe('Saved Views', () => {
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
