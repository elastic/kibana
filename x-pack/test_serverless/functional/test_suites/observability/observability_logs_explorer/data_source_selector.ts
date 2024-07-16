/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../../ftr_provider_context';

const initialPackageMap = {
  apache: 'Apache HTTP Server',
  aws: 'AWS',
  system: 'System',
};
const initialPackagesTexts = Object.values(initialPackageMap);

const expectedDataViews = ['logs-*', 'metrics-*'];
const sortedExpectedDataViews = expectedDataViews.slice().sort();

const uncategorized = ['logs-gaming-*', 'logs-manufacturing-*', 'logs-retail-*'];
const expectedUncategorized = uncategorized.map((dataset) => dataset.split('-')[1]);

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const dataViews = getService('dataViews');
  const PageObjects = getPageObjects([
    'common',
    'discover',
    'observabilityLogsExplorer',
    'svlCommonPage',
  ]);

  const noIntegrationsTitle = 'No integrations found';
  const noUncategorizedTitle = 'No data streams found';

  describe('DataSourceSelector', function () {
    // TimeoutError: Waiting for element to be located By(css selector, [data-test-subj="dataSourceSelectorPopoverButton"])
    this.tags(['failsOnMKI']);
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('viewer');
      await PageObjects.observabilityLogsExplorer.removeInstalledPackages();
    });

    describe('as consistent behavior', () => {
      before(async () => {
        await PageObjects.observabilityLogsExplorer.navigateTo();
      });

      beforeEach(async () => {
        await browser.refresh();
        await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
      });

      it('should always display the Integrations, Uncategorized and Data Views top level tabs', async () => {
        const integrationsTab = await PageObjects.observabilityLogsExplorer.getIntegrationsTab();
        const uncategorizedTab = await PageObjects.observabilityLogsExplorer.getUncategorizedTab();
        const dataViewsTab = await PageObjects.observabilityLogsExplorer.getDataViewsTab();

        expect(await integrationsTab.isDisplayed()).to.be(true);
        expect(await integrationsTab.getVisibleText()).to.be('Integrations');
        expect(await uncategorizedTab.isDisplayed()).to.be(true);
        expect(await uncategorizedTab.getVisibleText()).to.be('Uncategorized');
        expect(await dataViewsTab.isDisplayed()).to.be(true);
        expect(await dataViewsTab.getVisibleText()).to.be('Data Views');
      });

      it('should always display the "Show all logs" action', async () => {
        const allLogsButton = await PageObjects.observabilityLogsExplorer.getAllLogsButton();

        const allLogsTitle = await allLogsButton.getVisibleText();

        expect(allLogsTitle).to.be('Show all logs');
      });

      describe('when open on the integrations tab', () => {
        it('should display an error prompt if could not retrieve the integrations', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusErrorPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no integrations', async () => {
          const menuEntries = await PageObjects.observabilityLogsExplorer
            .getIntegrationsContextMenu()
            .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

          expect(menuEntries.length).to.be(0);
          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noIntegrationsTitle
          );
        });
      });

      describe('when open on the uncategorized tab', () => {
        it('should display a loading skeleton while loading uncategorized datasets', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await browser.setNetworkConditions('SLOW_3G'); // Almost stuck network conditions
            const uncategorizedTab =
              await PageObjects.observabilityLogsExplorer.getUncategorizedTab();
            await uncategorizedTab.click();

            await PageObjects.observabilityLogsExplorer.assertLoadingSkeletonExists();

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an error prompt if could not retrieve the datasets', async function () {
          const uncategorizedTab =
            await PageObjects.observabilityLogsExplorer.getUncategorizedTab();
          await uncategorizedTab.click();

          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.observabilityLogsExplorer.assertListStatusErrorPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no uncategorized data streams', async () => {
          const uncategorizedTab =
            await PageObjects.observabilityLogsExplorer.getUncategorizedTab();
          await uncategorizedTab.click();

          const uncategorizedEntries = await PageObjects.observabilityLogsExplorer
            .getUncategorizedContextMenu()
            .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

          expect(uncategorizedEntries.length).to.be(0);

          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noUncategorizedTitle
          );
        });
      });
    });

    describe('with installed integrations and uncategorized data streams', () => {
      let cleanupIntegrationsSetup: () => Promise<void>;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
        );
        cleanupIntegrationsSetup =
          await PageObjects.observabilityLogsExplorer.setupInitialIntegrations();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/observability_logs_explorer/data_streams'
        );
        await cleanupIntegrationsSetup();
      });

      describe('when open on the integrations tab', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
        });

        it('should display a list of installed integrations', async () => {
          const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();

          expect(integrations.length).to.be(3);
          expect(integrations).to.eql(initialPackagesTexts);
        });

        it('should sort the integrations list by the clicked sorting option', async () => {
          // Test ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });

          // Test descending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('desc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts.slice().reverse());
          });

          // Test back ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });
        });

        it('should filter the integrations list by the typed integration name', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('a');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache, initialPackageMap.aws]);
          });
        });

        it('should display an empty prompt when the search does not match any result', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('no result search text');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations.length).to.be(0);
          });

          await PageObjects.observabilityLogsExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noIntegrationsTitle
          );
        });

        it('should load more integrations by scrolling to the end of the list', async () => {
          // Install more integrations and reload the page
          const cleanupAdditionalSetup =
            await PageObjects.observabilityLogsExplorer.setupAdditionalIntegrations();
          await browser.refresh();

          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();

          // Initially fetched integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(15);
            await nodes.at(-1)?.scrollIntoView();
          });

          // Load more integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
            await nodes.at(-1)?.scrollIntoView();
          });

          // No other integrations to load after scrolling to last integration
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
          });

          await cleanupAdditionalSetup();
        });

        describe('clicking on integration and moving into the second navigation level', () => {
          before(async () => {
            await PageObjects.observabilityLogsExplorer.navigateTo();
          });

          beforeEach(async () => {
            await browser.refresh();
            await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          });

          it('should display a list of available datasets', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const [panelTitleNode, integrationDatasetEntries] =
                await PageObjects.observabilityLogsExplorer
                  .getIntegrationsContextMenu()
                  .then((menu) =>
                    Promise.all([
                      PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                      PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                    ])
                  );

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
              expect(await integrationDatasetEntries[0].getVisibleText()).to.be('access');
              expect(await integrationDatasetEntries[1].getVisibleText()).to.be('error');
            });
          });

          it('should sort the datasets list by the clicked sorting option', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            // Test ascending order
            await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });

            // Test descending order
            await PageObjects.observabilityLogsExplorer.clickSortButtonBy('desc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(await menuEntries[0].getVisibleText()).to.be('error');
              expect(await menuEntries[1].getVisibleText()).to.be('access');
            });

            // Test back ascending order
            await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });
          });

          it('should filter the datasets list by the typed dataset name', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });

            await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('err');

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(menuEntries.length).to.be(1);
              expect(await menuEntries[0].getVisibleText()).to.be('error');
            });
          });

          it('should update the current selection with the clicked dataset', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogsExplorer
                .getIntegrationsContextMenu()
                .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              menuEntries[0].click();
            });

            await retry.try(async () => {
              const selectorButton =
                await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButton();

              expect(await selectorButton.getVisibleText()).to.be('[Apache HTTP Server] access');
            });
          });
        });
      });

      describe('when open on the uncategorized tab', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          await PageObjects.observabilityLogsExplorer
            .getUncategorizedTab()
            .then((tab) => tab.click());
        });

        it('should display a list of available datasets', async () => {
          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) =>
                Promise.all([
                  PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });
        });

        it('should sort the datasets list by the clicked sorting option', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          // Test ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          // Test descending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[2]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[0]);
          });

          // Test back ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });
        });

        it('should filter the datasets list by the typed dataset name', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('retail');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('retail');
          });
        });

        it('should update the current selection with the clicked dataset', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getUncategorizedContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const selectorButton =
              await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be(expectedUncategorized[0]);
          });
        });
      });

      describe('when open on the data views tab', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          await PageObjects.observabilityLogsExplorer.getDataViewsTab().then((tab) => tab.click());
        });

        it('should display a list of available data views', async () => {
          const menu = await PageObjects.observabilityLogsExplorer.getDataViewsContextMenu();
          const menuEntries = await PageObjects.observabilityLogsExplorer.getPanelEntries(menu);

          expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
          expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
        });

        it('should filter the list of data views by type', async () => {
          await PageObjects.observabilityLogsExplorer.changeDataViewTypeFilter('Logs');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[0]);
          });

          // Test back all filter
          await PageObjects.observabilityLogsExplorer.changeDataViewTypeFilter('All');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
          });
        });

        it('should sort the data views list by the clicked sorting option', async () => {
          // Test descending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[1]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[0]);
          });

          // Test back ascending order
          await PageObjects.observabilityLogsExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
          });
        });

        it('should filter the data views list by the typed data view name', async () => {
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('logs');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('logs-*');
          });
        });

        it('should load a data view allowed by the settings upon click', async () => {
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogsExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const url = await browser.getCurrentUrl();
            expect(url).to.contain(`/app/observability-logs-explorer`);
          });

          await retry.try(async () => {
            const selectorButton =
              await PageObjects.observabilityLogsExplorer.getDataSourceSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be(expectedDataViews[0]);
          });
        });

        it('should navigate to Discover and load a data view not allowed by the settings upon click', async () => {
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getDataViewsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
            menuEntries[1].click();
          });

          await retry.try(async () => {
            const url = await browser.getCurrentUrl();
            expect(url).to.contain(`/app/discover`);
          });

          await dataViews.waitForSwitcherToBe(expectedDataViews[1]);
        });
      });

      describe('when open/close the selector', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
        });

        it('should restore the latest navigation panel', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogsExplorer
              .getIntegrationsContextMenu()
              .then((menu) =>
                Promise.all([
                  PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.observabilityLogsExplorer.closeDataSourceSelector();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogsExplorer
              .getIntegrationsContextMenu()
              .then((menu) =>
                Promise.all([
                  PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });
        });

        it('should restore the latest search results', async () => {
          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogsExplorer.closeDataSourceSelector();
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });
        });
      });

      describe('when switching between tabs or integration panels', () => {
        before(async () => {
          await PageObjects.observabilityLogsExplorer.navigateTo();
        });

        it('should remember the latest search and restore its results', async () => {
          await PageObjects.observabilityLogsExplorer.openDataSourceSelector();
          await PageObjects.observabilityLogsExplorer.clearSearchField();

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('apache');

          await retry.try(async () => {
            const { nodes, integrations } =
              await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);
            nodes[0].click();
          });

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogsExplorer
              .getIntegrationsContextMenu()
              .then((menu) =>
                Promise.all([
                  PageObjects.observabilityLogsExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogsExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.observabilityLogsExplorer.typeSearchFieldWith('err');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getIntegrationsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });

          // Navigate back to integrations
          const panelTitleNode = await PageObjects.observabilityLogsExplorer
            .getIntegrationsContextMenu()
            .then((menu) => PageObjects.observabilityLogsExplorer.getPanelTitle(menu));
          panelTitleNode.click();

          await retry.try(async () => {
            const { nodes, integrations } =
              await PageObjects.observabilityLogsExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);

            const searchValue = await PageObjects.observabilityLogsExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('apache');

            nodes[0].click();
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogsExplorer
              .getIntegrationsContextMenu()
              .then((menu) => PageObjects.observabilityLogsExplorer.getPanelEntries(menu));

            const searchValue = await PageObjects.observabilityLogsExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('err');

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });
        });
      });
    });
  });
}
