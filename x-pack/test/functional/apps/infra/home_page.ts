/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { parse } from 'url';
import { KUBERNETES_TOUR_STORAGE_KEY } from '@kbn/infra-plugin/public/pages/metrics/inventory_view/components/kubernetes_tour';
import { InfraSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { enableInfrastructureContainerAssetView } from '@kbn/observability-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';
import { DATES, INVENTORY_PATH } from './constants';
import { generateDockerContainersData } from './helpers';
import { getInfraSynthtraceEsClient } from '../../../common/utils/synthtrace/infra_es_client';

const DATE_WITH_DATA = DATES.metricsAndLogs.hosts.withData;
const DATE_WITHOUT_DATA = DATES.metricsAndLogs.hosts.withoutData;
const DATE_WITH_POD_WITH_DATA = DATES.metricsAndLogs.pods.withData;
const DATE_WITH_DOCKER_DATA_FROM = '2023-03-28T18:20:00.000Z';
const DATE_WITH_DOCKER_DATA_TO = '2023-03-28T18:21:00.000Z';
const DATE_WITH_DOCKER_DATA = '03/28/2023 6:20:00 PM';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const browser = getService('browser');
  const retry = getService('retry');
  const esClient = getService('es');
  const infraSynthtraceKibanaClient = getService('infraSynthtraceKibanaClient');
  const pageObjects = getPageObjects([
    'common',
    'header',
    'infraHome',
    'timePicker',
    'assetDetails',
    'infraSavedViews',
  ]);
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');

  const returnTo = async (path: string, timeout = 2000) =>
    retry.waitForWithTimeout('returned to inventory', timeout, async () => {
      await browser.goBack();
      await pageObjects.header.waitUntilLoadingHasFinished();
      const currentUrl = await browser.getCurrentUrl();
      return !!currentUrl.match(path);
    });

  const setInfrastructureContainerAssetViewUiSetting = async (value: boolean = true) => {
    await kibanaServer.uiSettings.update({ [enableInfrastructureContainerAssetView]: value });
    await browser.refresh();
    await pageObjects.header.waitUntilLoadingHasFinished();
  };

  describe('Home page', function () {
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

      // Unskip once asset details error handling has been implemented
      it.skip('renders the correct error page title', async () => {
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
      });
    });

    describe('with metrics present', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/pods_only');
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });
      after(async () => {
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/pods_only');
        await browser.removeLocalStorageItem(KUBERNETES_TOUR_STORAGE_KEY);
      });

      it('renders the correct page title', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();

        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain('Inventory - Infrastructure - Observability - Elastic');
      });

      it('renders the inventory survey link', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();
        await pageObjects.infraHome.waitForLoading();

        await pageObjects.infraHome.ensureInventoryFeedbackLinkIsVisible();
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

        await retry.try(async () => {
          await pageObjects.infraHome.ensureKubernetesTourIsClosed();
        });
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

      describe('Asset Details flyout for a host', () => {
        before(async () => {
          await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await pageObjects.infraHome.getWaffleMap();
          await pageObjects.infraHome.inputAddHostNameFilter('demo-stack-nginx-01');
          await pageObjects.infraHome.clickOnNode();
        });

        after(async () => {
          await retry.try(async () => {
            await pageObjects.infraHome.clickCloseFlyoutButton();
          });
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();
          });

          [
            { metric: 'cpuUsage', value: '0.8%' },
            { metric: 'normalizedLoad1m', value: '1.4%' },
            { metric: 'memoryUsage', value: '18.0%' },
            { metric: 'diskUsage', value: '35.0%' },
          ].forEach(({ metric, value }) => {
            it(`${metric} tile should show ${value}`, async () => {
              await retry.tryForTime(3 * 1000, async () => {
                const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(
                  metric
                );
                expect(tileValue).to.eql(value);
              });
            });
          });

          [
            { metric: 'cpu', chartsCount: 2 },
            { metric: 'memory', chartsCount: 1 },
            { metric: 'disk', chartsCount: 2 },
            { metric: 'network', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
              const hosts = await pageObjects.assetDetails.getOverviewTabHostMetricCharts(metric);
              expect(hosts.length).to.equal(chartsCount);
            });
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
          });
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataTab();
          });

          it('should show metadata table', async () => {
            await pageObjects.assetDetails.metadataTableExists();
          });
        });

        describe('Metrics Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetricsTab();
          });

          it('should show metrics content', async () => {
            await pageObjects.assetDetails.metricsChartsContentExists();
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickLogsTab();
          });

          after(async () => {
            await retry.try(async () => {
              await pageObjects.infraHome.closeFlyout();
            });
          });

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });
        });

        describe('APM Link Tab', () => {
          before(async () => {
            await pageObjects.infraHome.clickOnNode();
            await pageObjects.assetDetails.clickApmTabLink();
            await pageObjects.infraHome.waitForLoading();
          });

          it('should navigate to APM traces', async () => {
            const url = parse(await browser.getCurrentUrl());
            const query = decodeURIComponent(url.query ?? '');
            const kuery = 'kuery=host.hostname:"demo-stack-nginx-01"';

            await retry.try(async () => {
              expect(url.pathname).to.eql('/app/apm/traces');
              expect(query).to.contain(kuery);
            });
            await returnTo(INVENTORY_PATH);
          });
        });

        it('Should show auto-refresh option', async () => {
          const kibanaRefreshConfig = await pageObjects.timePicker.getRefreshConfig();
          expect(kibanaRefreshConfig.interval).to.equal('5');
          expect(kibanaRefreshConfig.units).to.equal('Seconds');
          expect(kibanaRefreshConfig.isPaused).to.equal(true);
        });
      });

      describe('Asset Details flyout for a container', () => {
        let synthEsClient: InfraSynthtraceEsClient;
        before(async () => {
          await setInfrastructureContainerAssetViewUiSetting(true);
          const version = await infraSynthtraceKibanaClient.fetchLatestSystemPackageVersion();
          await infraSynthtraceKibanaClient.installSystemPackage(version);
          synthEsClient = await getInfraSynthtraceEsClient(esClient);
          await synthEsClient.index(
            generateDockerContainersData({
              from: DATE_WITH_DOCKER_DATA_FROM,
              to: DATE_WITH_DOCKER_DATA_TO,
              count: 5,
            })
          );

          await pageObjects.infraHome.goToContainer();
          await pageObjects.infraHome.goToTime(DATE_WITH_DOCKER_DATA);
          await pageObjects.infraHome.clickOnFirstNode();
        });

        after(async () => {
          await setInfrastructureContainerAssetViewUiSetting(false);
          return await synthEsClient.clean();
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();
          });

          [
            { metric: 'cpuUsage', value: '25.0%' },
            { metric: 'memoryUsage', value: '20.0%' },
          ].forEach(({ metric, value }) => {
            it(`${metric} tile should show ${value}`, async () => {
              await retry.tryForTime(3 * 1000, async () => {
                const tileValue = await pageObjects.assetDetails.getAssetDetailsKPITileValue(
                  metric
                );
                expect(tileValue).to.eql(value);
              });
            });
          });

          [
            { metric: 'cpu', chartsCount: 1 },
            { metric: 'memory', chartsCount: 1 },
          ].forEach(({ metric, chartsCount }) => {
            it.skip(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
              const containers = await pageObjects.assetDetails.getOverviewTabDockerMetricCharts(
                metric
              );
              expect(containers.length).to.equal(chartsCount);
            });
          });
        });

        describe('Metadata Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickMetadataTab();
          });

          it('should show metadata table', async () => {
            await pageObjects.assetDetails.metadataTableExists();
          });
        });

        describe('Logs Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickLogsTab();
          });

          after(async () => {
            await retry.try(async () => {
              await pageObjects.infraHome.closeFlyout();
            });
          });

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });
        });

        describe('APM Link Tab', () => {
          before(async () => {
            await pageObjects.infraHome.clickOnNode();
            await pageObjects.assetDetails.clickApmTabLink();
            await pageObjects.infraHome.waitForLoading();
          });

          it('should navigate to APM traces', async () => {
            const url = parse(await browser.getCurrentUrl());
            const query = decodeURIComponent(url.query ?? '');
            const kuery = 'kuery=container.id:"container-id-4"';

            await retry.try(async () => {
              expect(url.pathname).to.eql('/app/apm/traces');
              expect(query).to.contain(kuery);
            });
            await returnTo(INVENTORY_PATH);
          });
        });

        it('Should show auto-refresh option', async () => {
          const kibanaRefreshConfig = await pageObjects.timePicker.getRefreshConfig();
          expect(kibanaRefreshConfig.interval).to.equal('5');
          expect(kibanaRefreshConfig.units).to.equal('Seconds');
          expect(kibanaRefreshConfig.isPaused).to.equal(true);
        });
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

      it('toggles the inventory switcher', async () => {
        await pageObjects.infraHome.toggleInventorySwitcher();
      });

      describe('Redirect to Node Details page', () => {
        before(async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.waitForLoading();
        });

        it('Should redirect to Host Details page', async () => {
          await pageObjects.infraHome.goToTime(DATE_WITH_DATA);
          await pageObjects.infraHome.goToHost();
          await pageObjects.infraHome.clickOnFirstNode();
          await pageObjects.infraHome.clickOnNodeDetailsFlyoutOpenAsPage();

          await retry.try(async () => {
            const documentTitle = await browser.getTitle();
            expect(documentTitle).to.contain(
              'demo-stack-redis-01 - Inventory - Infrastructure - Observability - Elastic'
            );
          });

          await returnTo(INVENTORY_PATH);
        });

        it('Should redirect to Pod Details page', async () => {
          await pageObjects.infraHome.goToPods();
          await pageObjects.infraHome.goToTime(DATE_WITH_POD_WITH_DATA);
          await pageObjects.infraHome.clickOnFirstNode();
          await pageObjects.infraHome.clickOnGoToNodeDetails();

          await retry.try(async () => {
            const documentTitle = await browser.getTitle();
            expect(documentTitle).to.contain(
              'pod-0 - Inventory - Infrastructure - Observability - Elastic'
            );
          });

          await returnTo(INVENTORY_PATH);
        });

        describe('Redirect to Container Details page', () => {
          let synthEsClient: InfraSynthtraceEsClient;
          before(async () => {
            const version = await infraSynthtraceKibanaClient.fetchLatestSystemPackageVersion();
            await infraSynthtraceKibanaClient.installSystemPackage(version);
            synthEsClient = await getInfraSynthtraceEsClient(esClient);
            await synthEsClient.index(
              generateDockerContainersData({
                from: DATE_WITH_DOCKER_DATA_FROM,
                to: DATE_WITH_DOCKER_DATA_TO,
                count: 5,
              })
            );
          });

          after(async () => {
            return await synthEsClient.clean();
          });
          it('Should redirect to Container Details page', async () => {
            await pageObjects.infraHome.goToContainer();
            await pageObjects.infraHome.goToTime(DATE_WITH_DOCKER_DATA);
            await pageObjects.infraHome.clickOnFirstNode();
            await pageObjects.infraHome.clickOnGoToNodeDetails();

            await retry.try(async () => {
              const documentTitle = await browser.getTitle();
              expect(documentTitle).to.contain(
                'container-id-4 - Inventory - Infrastructure - Observability - Elastic'
              );
            });

            await returnTo(INVENTORY_PATH);
          });
        });
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
        await retry.try(async () => {
          await pageObjects.infraHome.ensurePopoverClosed();
        });
      });

      it('should not have an option to create custom threshold alert', async () => {
        await pageObjects.infraHome.clickAlertsAndRules();
        await pageObjects.infraHome.ensurePopoverOpened();
        await pageObjects.infraHome.ensureCustomThresholdAlertMenuItemIsMissing();
        await pageObjects.infraHome.clickAlertsAndRules();
      });
    });

    describe('Saved Views', () => {
      before(async () => {
        await esArchiver.load('x-pack/test/functional/es_archives/infra/metrics_and_logs');
        await pageObjects.infraHome.goToMetricExplorer();
      });

      after(() => esArchiver.unload('x-pack/test/functional/es_archives/infra/metrics_and_logs'));

      beforeEach(async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
      });
      afterEach(async () => {
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should render a button with the view name', async () => {
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should open/close the views popover menu on button click', async () => {
        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await testSubjects.existOrFail('savedViews-popover');
        await pageObjects.infraSavedViews.closeSavedViewsPopover();
      });

      it('should create a new saved view and load it', async () => {
        await pageObjects.infraSavedViews.createView('view1');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view1');
      });

      it('should load a clicked view from the manage views section', async () => {
        const views = await pageObjects.infraSavedViews.getManageViewsEntries();
        await views[0].click();
        await pageObjects.infraSavedViews.ensureViewIsLoaded('Default view');
      });

      it('should update the current saved view and load it', async () => {
        let views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(2);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.createView('view2');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view2');

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        await pageObjects.infraSavedViews.updateView('view3');
        await pageObjects.infraSavedViews.ensureViewIsLoaded('view3');

        await pageObjects.infraSavedViews.clickSavedViewsButton();
        views = await pageObjects.infraSavedViews.getManageViewsEntries();
        expect(views.length).to.equal(3);
        await pageObjects.infraSavedViews.pressEsc();
      });
    });
  });
};
