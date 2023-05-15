/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KUBERNETES_TOUR_STORAGE_KEY } from '@kbn/infra-plugin/public/pages/metrics/inventory_view/components/kubernetes_tour';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES } from './constants';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const pageObjects = getPageObjects(['common', 'header', 'infraHome', 'infraSavedViews']);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  // Failing: See https://github.com/elastic/kibana/issues/157713
  describe.skip('Home page', function () {
    this.tags('includeFirefox');
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
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

      it('renders the correct error page title', async () => {
        await pageObjects.common.navigateToUrlWithBrowserHistory(
          'infraOps',
          '/detail/host/test',
          '',
          {
            ensureCurrentUrl: false,
          }
        );
        await pageObjects.infraHome.waitForLoading();
        await pageObjects.header.waitUntilLoadingHasFinished();

        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Uh oh - Observability - Elastic');
      });
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await browser.removeLocalStorageItem(KUBERNETES_TOUR_STORAGE_KEY);
      });

      it('renders the correct page title', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();

        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Inventory - Infrastructure - Observability - Elastic');
      });

      it('renders the kubernetes tour component and allows user to dismiss it without seeing it again', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        const kubernetesTourText =
          'Click here to see your infrastructure in different ways, including Kubernetes pods.';
        const ensureKubernetesTourVisible =
          await pageObjects.infraHome.ensureKubernetesTourIsVisible();

        expect(ensureKubernetesTourVisible).to.contain(kubernetesTourText);

        // Persist after refresh
        await browser.refresh();
        await pageObjects.infraHome.waitForLoading();

        expect(ensureKubernetesTourVisible).to.contain(kubernetesTourText);

        await pageObjects.infraHome.clickDismissKubernetesTourButton();

        await pageObjects.infraHome.ensureKubernetesTourIsClosed();
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });
      it('renders the waffle map and tooltips for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.getWaffleMap();
        // await pageObjects.infraHome.getWaffleMapTooltips(); see https://github.com/elastic/kibana/issues/137903
      });
      it('shows query suggestions', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
        await pageObjects.infraHome.clickQueryBar();
        await pageObjects.infraHome.inputQueryData();
        await pageObjects.infraHome.ensureSuggestionsPanelVisible();
        await pageObjects.infraHome.clearSearchTerm();
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

    // FLAKY: https://github.com/elastic/kibana/issues/157711
    describe.skip('alerts flyouts', () => {
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
      before(async () => {
        esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });

      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

      it('should render a button with the view name', async () => {
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should open/close the views popover menu on button click', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        testSubjects.existOrFail('savedViews-popover');
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should create a new saved view and load it', async () => {
        await pageObjects.infraSavedViews.createView('view1');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
      });

      it('should laod a clicked view from the manage views section', async () => {
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
        const views = await pageObjects.infraSavedViews.getManageViewsEntries();
        await views[0].click();
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should update the current saved view and load it', async () => {
        let views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(2);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.createView('view2');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view2');
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.updateView('view3');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view3');
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();
      });
    });
  });
};
