/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { KUBERNETES_TOUR_STORAGE_KEY } from '@kbn/infra-plugin/public/pages/metrics/inventory_view/components/kubernetes_tour';
import { InfraSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  INVENTORY_PATH,
  DATE_WITH_DOCKER_DATA_FROM,
  DATE_WITH_DOCKER_DATA_TO,
  DATE_WITH_DOCKER_DATA,
  DATE_WITH_HOSTS_DATA_FROM,
  DATE_WITH_HOSTS_DATA_TO,
  DATE_WITH_HOSTS_DATA,
  DATE_WITH_POD_DATA,
  DATE_WITH_POD_DATA_FROM,
  DATE_WITH_POD_DATA_TO,
} from './constants';
import { generateDockerContainersData, generateHostData, generatePodsData } from './helpers';
import { getInfraSynthtraceEsClient } from '../../../common/utils/synthtrace/infra_es_client';

const DATE_WITHOUT_DATA = '10/09/2018 10:00:00 PM';

const HOSTS = [
  {
    hostName: 'host-1',
    cpuValue: 0.5,
  },
  {
    hostName: 'host-2',
    cpuValue: 0.7,
  },
  {
    hostName: 'host-3',
    cpuValue: 0.9,
  },
  {
    hostName: 'host-4',
    cpuValue: 0.3,
  },
  {
    hostName: 'host-5',
    cpuValue: 0.1,
  },
];

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const browser = getService('browser');
  const retry = getService('retry');
  const esClient = getService('es');
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

  describe('Home page', function () {
    this.tags('includeFirefox');
    let synthEsClient: InfraSynthtraceEsClient;

    before(async () => {
      synthEsClient = await getInfraSynthtraceEsClient(esClient);
      await kibanaServer.savedObjects.cleanStandardList();
      return synthEsClient.clean();
    });

    after(() => synthEsClient.clean());

    describe('without metrics present', () => {
      it('renders an empty data prompt and redirects to the onboarding page', async () => {
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.noDataPromptExists();
        await pageObjects.infraHome.noDataPromptAddDataClick();

        await retry.tryForTime(5000, async () => {
          const currentUrl = await browser.getCurrentUrl();
          const parsedUrl = new URL(currentUrl);
          const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
          const expectedUrlPattern = `${baseUrl}/app/observabilityOnboarding/?category=infra`;
          expect(currentUrl).to.equal(expectedUrlPattern);
        });
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
        await synthEsClient.index([
          generateHostData({
            from: DATE_WITH_HOSTS_DATA_FROM,
            to: DATE_WITH_HOSTS_DATA_TO,
            hosts: HOSTS,
          }),
          generateDockerContainersData({
            from: DATE_WITH_DOCKER_DATA_FROM,
            to: DATE_WITH_DOCKER_DATA_TO,
            count: 5,
          }),
          generatePodsData({
            from: DATE_WITH_POD_DATA_FROM,
            to: DATE_WITH_POD_DATA_TO,
            count: 1,
          }),
        ]);
        await pageObjects.common.navigateToApp('infraOps');
        await pageObjects.infraHome.waitForLoading();
      });

      after(async () => browser.removeLocalStorageItem(KUBERNETES_TOUR_STORAGE_KEY));

      it('renders the correct page title', async () => {
        await pageObjects.header.waitUntilLoadingHasFinished();

        const documentTitle = await browser.getTitle();
        expect(documentTitle).to.contain(
          'Infrastructure Inventory - Infrastructure - Observability - Elastic'
        );
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

        await retry.tryForTime(5000, async () => {
          await pageObjects.infraHome.ensureKubernetesTourIsClosed();
        });
      });

      it('renders an empty data prompt for dates with no data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITHOUT_DATA);
        await pageObjects.infraHome.getNoMetricsDataPrompt();
      });

      it('renders the waffle map and tooltips for dates with data', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.getWaffleMap();
        // await pageObjects.infraHome.getWaffleMapTooltips(); see https://github.com/elastic/kibana/issues/137903
      });

      describe('Asset Details flyout for a host', () => {
        before(async () => {
          await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
          await pageObjects.infraHome.getWaffleMap();
          await pageObjects.infraHome.inputAddHostNameFilter('host-1');
          await pageObjects.infraHome.clickOnNode();
        });

        after(async () => {
          await retry.tryForTime(5000, async () => {
            await pageObjects.infraHome.clickCloseFlyoutButton();
          });
        });

        describe('Overview Tab', () => {
          before(async () => {
            await pageObjects.assetDetails.clickOverviewTab();
          });

          [
            { metric: 'cpuUsage', value: '50.0%' },
            { metric: 'normalizedLoad1m', value: '18.8%' },
            { metric: 'memoryUsage', value: '35.0%' },
            { metric: 'diskUsage', value: '1,223.0%' },
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

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });
        });
      });

      describe('Asset Details flyout for a container', () => {
        before(async () => {
          await pageObjects.infraHome.goToContainer();
          await pageObjects.infraHome.goToTime(DATE_WITH_DOCKER_DATA);
          await pageObjects.infraHome.clickOnFirstNode();
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
              await retry.tryForTime(5000, async () => {
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
            it(`should render ${chartsCount} ${metric} chart(s) in the Metrics section`, async () => {
              const containers = await pageObjects.assetDetails.getOverviewTabDockerMetricCharts(
                metric
              );
              expect(containers.length).to.equal(chartsCount);
            });
          });

          it('should show alerts', async () => {
            await pageObjects.header.waitUntilLoadingHasFinished();
            await pageObjects.assetDetails.overviewAlertsTitleExists();
            await pageObjects.assetDetails.overviewLinkToAlertsExist();
            await pageObjects.assetDetails.overviewOpenAlertsFlyoutExist();
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
            await retry.tryForTime(5000, async () => {
              await pageObjects.infraHome.closeFlyout();
            });
          });

          it('should render logs tab', async () => {
            await pageObjects.assetDetails.logsExists();
          });
        });
      });

      it('shows query suggestions', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.clickQueryBar();
        await pageObjects.infraHome.inputQueryData();
        await pageObjects.infraHome.ensureSuggestionsPanelVisible();
        await pageObjects.infraHome.clearSearchTerm();
      });

      it('sort nodes by descending value', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.sortNodesBy('value');
        await retry.tryForTime(5000, async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'host-3', value: 90, color: '#61a2ff' },
            { name: 'host-2', value: 70, color: '#80b2ff' },
            { name: 'host-1', value: 50, color: '#9bc2ff' },
            { name: 'host-4', value: 30, color: '#c2d9ff' },
            { name: 'host-5', value: 10, color: '#dbe9ff' },
          ]);
        });
      });

      it('sort nodes by ascending value', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.sortNodesBy('value');
        await pageObjects.infraHome.toggleReverseSort();
        await retry.tryForTime(5000, async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'host-5', value: 10, color: '#dbe9ff' },
            { name: 'host-4', value: 30, color: '#c2d9ff' },
            { name: 'host-1', value: 50, color: '#9bc2ff' },
            { name: 'host-2', value: 70, color: '#80b2ff' },
            { name: 'host-3', value: 90, color: '#61a2ff' },
          ]);
        });
      });

      it('group nodes by custom field', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await retry.tryForTime(5000, async () => {
          const groups = await pageObjects.infraHome.groupByCustomField('host.os.platform');
          expect(groups).to.eql(['ubuntu']);
        });
      });

      it('filter nodes by search term', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.getWaffleMap();
        await pageObjects.infraHome.enterSearchTerm('host.name: "host-1"');
        await retry.tryForTime(5000, async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([{ name: 'host-1', value: 50, color: '#61a2ff' }]);
        });
        await pageObjects.infraHome.clearSearchTerm();
      });

      it('change color palette', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        await pageObjects.infraHome.openLegendControls();
        await pageObjects.infraHome.changePalette('temperature');
        await pageObjects.infraHome.applyLegendControls();
        await retry.tryForTime(5000, async () => {
          const nodesWithValue = await pageObjects.infraHome.getNodesWithValues();
          expect(nodesWithValue).to.eql([
            { name: 'host-5', value: 10, color: '#61a2ff' },
            { name: 'host-4', value: 30, color: '#b5d2ff' },
            { name: 'host-1', value: 50, color: '#fbefee' },
            { name: 'host-2', value: 70, color: '#ffbab3' },
            { name: 'host-3', value: 90, color: '#f6726a' },
          ]);
        });
      });

      it('toggle the timeline', async () => {
        await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
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
          await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
          await pageObjects.infraHome.goToHost();
          await pageObjects.infraHome.clickOnFirstNode();
          await pageObjects.infraHome.clickOnNodeDetailsFlyoutOpenAsPage();

          await retry.tryForTime(5000, async () => {
            const documentTitle = await browser.getTitle();
            expect(documentTitle).to.contain(
              'host-5 - Infrastructure Inventory - Infrastructure - Observability - Elastic'
            );
          });

          await returnTo(INVENTORY_PATH);
        });

        describe('Redirect to Pod Details page', () => {
          it('should redirect to Pod Details page', async () => {
            await pageObjects.infraHome.goToPods();
            await pageObjects.infraHome.goToTime(DATE_WITH_POD_DATA);
            await pageObjects.infraHome.clickOnFirstNode();
            await pageObjects.infraHome.clickOnGoToNodeDetails();

            await retry.tryForTime(5000, async () => {
              const documentTitle = await browser.getTitle();
              expect(documentTitle).to.contain(
                'pod-0 - Infrastructure Inventory - Infrastructure - Observability - Elastic'
              );
            });

            await returnTo(INVENTORY_PATH);
          });
        });

        describe('Redirect to Container Details page', () => {
          it('should redirect to Container Details page', async () => {
            await pageObjects.infraHome.goToContainer();
            await pageObjects.infraHome.goToTime(DATE_WITH_DOCKER_DATA);
            await pageObjects.infraHome.clickOnFirstNode();
            await pageObjects.infraHome.clickOnNodeDetailsFlyoutOpenAsPage();

            await retry.tryForTime(5000, async () => {
              const documentTitle = await browser.getTitle();
              expect(documentTitle).to.contain(
                'container-id-4 - Infrastructure Inventory - Infrastructure - Observability - Elastic'
              );
            });

            await returnTo(INVENTORY_PATH);
          });
        });
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
        ];

        for (const field of fields) {
          await pageObjects.infraHome.addCustomMetric(field);
        }
        const metricsCount = await pageObjects.infraHome.getMetricsContextMenuItemsCount();
        // there are 7 default metrics in the context menu for hosts
        expect(metricsCount).to.eql(20);

        await pageObjects.infraHome.ensureCustomMetricAddButtonIsDisabled();
        // close
        await pageObjects.infraHome.clickCustomMetricDropdown();
      });

      describe('alerts flyouts', () => {
        before(async () => {
          await pageObjects.common.navigateToApp('infraOps');
          await pageObjects.infraHome.waitForLoading();
          await pageObjects.infraHome.goToTime(DATE_WITH_HOSTS_DATA);
        });

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
          await retry.tryForTime(5000, async () => {
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
          await pageObjects.infraHome.goToMetricExplorer();
        });

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
  });
};
