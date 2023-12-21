/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from './config';

const initialPackageMap = {
  apache: 'Apache HTTP Server',
  aws: 'AWS',
  system: 'System',
};
const initialPackagesTexts = Object.values(initialPackageMap);

const expectedDataViews = ['logs-*', 'logstash-*', 'metrics-*'];
const sortedExpectedDataViews = expectedDataViews.slice().sort();

const uncategorized = ['logs-gaming-*', 'logs-manufacturing-*', 'logs-retail-*'];
const expectedUncategorized = uncategorized.map((dataset) => dataset.split('-')[1]);

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discover', 'observabilityLogExplorer']);

  const noIntegrationsTitle = 'No integrations found';
  const noUncategorizedTitle = 'No data streams found';

  describe('Dataset Selector', () => {
    before(async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await PageObjects.observabilityLogExplorer.removeInstalledPackages();
    });

    after(async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
    });

    describe('as consistent behavior', () => {
      before(async () => {
        await PageObjects.observabilityLogExplorer.navigateTo();
      });

      beforeEach(async () => {
        await browser.refresh();
        await PageObjects.observabilityLogExplorer.openDatasetSelector();
      });

      it('should always display the Integrations Uncategorized and Data Views top level tabs', async () => {
        const integrationsTab = await PageObjects.observabilityLogExplorer.getIntegrationsTab();
        const uncategorizedTab = await PageObjects.observabilityLogExplorer.getUncategorizedTab();
        const dataViewsTab = await PageObjects.observabilityLogExplorer.getDataViewsTab();

        expect(await integrationsTab.isDisplayed()).to.be(true);
        expect(await integrationsTab.getVisibleText()).to.be('Integrations');
        expect(await uncategorizedTab.isDisplayed()).to.be(true);
        expect(await uncategorizedTab.getVisibleText()).to.be('Uncategorized');
        expect(await dataViewsTab.isDisplayed()).to.be(true);
        expect(await dataViewsTab.getVisibleText()).to.be('Data Views');
      });

      it('should always display the "Show all logs" action', async () => {
        const allLogDatasetButton =
          await PageObjects.observabilityLogExplorer.getAllLogDatasetsButton();

        const allLogDatasetTitle = await allLogDatasetButton.getVisibleText();

        expect(allLogDatasetTitle).to.be('Show all logs');
      });

      describe('when open on the integrations tab', () => {
        it('should display an error prompt if could not retrieve the integrations', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.observabilityLogExplorer.assertListStatusErrorPromptExistsWithTitle(
                noIntegrationsTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no integrations', async () => {
          const menuEntries = await PageObjects.observabilityLogExplorer
            .getIntegrationsContextMenu()
            .then((menu: WebElementWrapper) =>
              PageObjects.observabilityLogExplorer.getPanelEntries(menu)
            );

          expect(menuEntries.length).to.be(0);
          await PageObjects.observabilityLogExplorer.assertListStatusEmptyPromptExistsWithTitle(
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
              await PageObjects.observabilityLogExplorer.getUncategorizedTab();
            await uncategorizedTab.click();

            await PageObjects.observabilityLogExplorer.assertLoadingSkeletonExists();

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an error prompt if could not retrieve the datasets', async function () {
          const uncategorizedTab = await PageObjects.observabilityLogExplorer.getUncategorizedTab();
          await uncategorizedTab.click();

          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.observabilityLogExplorer.assertListStatusEmptyPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.observabilityLogExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.observabilityLogExplorer.assertListStatusErrorPromptExistsWithTitle(
                noUncategorizedTitle
              );
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no uncategorized data streams', async () => {
          const uncategorizedTab = await PageObjects.observabilityLogExplorer.getUncategorizedTab();
          await uncategorizedTab.click();

          const uncategorizedEntries = await PageObjects.observabilityLogExplorer
            .getUncategorizedContextMenu()
            .then((menu: WebElementWrapper) =>
              PageObjects.observabilityLogExplorer.getPanelEntries(menu)
            );

          expect(uncategorizedEntries.length).to.be(0);

          await PageObjects.observabilityLogExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noUncategorizedTitle
          );
        });
      });
    });

    describe('with installed integrations and uncategorized data streams', () => {
      let cleanupIntegrationsSetup: () => Promise<void>;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
        );
        cleanupIntegrationsSetup =
          await PageObjects.observabilityLogExplorer.setupInitialIntegrations();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/observability_log_explorer/data_streams'
        );
        await cleanupIntegrationsSetup();
      });

      describe('when open on the integrations tab', () => {
        before(async () => {
          await PageObjects.observabilityLogExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();
        });

        it('should display a list of installed integrations', async () => {
          const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();

          expect(integrations.length).to.be(3);
          expect(integrations).to.eql(initialPackagesTexts);
        });

        it('should sort the integrations list by the clicked sorting option', async () => {
          // Test ascending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });

          // Test descending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('desc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts.slice().reverse());
          });

          // Test back ascending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });
        });

        it('should filter the integrations list by the typed integration name', async () => {
          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('a');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache, initialPackageMap.aws]);
          });
        });

        it('should display an empty prompt when the search does not match any result', async () => {
          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('no result search text');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations.length).to.be(0);
          });

          await PageObjects.observabilityLogExplorer.assertListStatusEmptyPromptExistsWithTitle(
            noIntegrationsTitle
          );
        });

        it('should load more integrations by scrolling to the end of the list', async () => {
          // Install more integrations and reload the page
          const cleanupAdditionalSetup =
            await PageObjects.observabilityLogExplorer.setupAdditionalIntegrations();
          await browser.refresh();

          await PageObjects.observabilityLogExplorer.openDatasetSelector();

          // Initially fetched integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(nodes.length).to.be(15);
            await nodes.at(-1)?.scrollIntoView();
          });

          // Load more integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
            await nodes.at(-1)?.scrollIntoView();
          });

          // No other integrations to load after scrolling to last integration
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
          });

          cleanupAdditionalSetup();
        });

        describe('clicking on integration and moving into the second navigation level', () => {
          before(async () => {
            await PageObjects.observabilityLogExplorer.navigateTo();
          });

          beforeEach(async () => {
            await browser.refresh();
            await PageObjects.observabilityLogExplorer.openDatasetSelector();
          });

          it('should display a list of available datasets', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const [panelTitleNode, integrationDatasetEntries] =
                await PageObjects.observabilityLogExplorer
                  .getIntegrationsContextMenu()
                  .then((menu: WebElementWrapper) =>
                    Promise.all([
                      PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                      PageObjects.observabilityLogExplorer.getPanelEntries(menu),
                    ])
                  );

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
              expect(await integrationDatasetEntries[0].getVisibleText()).to.be('access');
              expect(await integrationDatasetEntries[1].getVisibleText()).to.be('error');
            });
          });

          it('should sort the datasets list by the clicked sorting option', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu)
                );

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            // Test ascending order
            await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });

            // Test descending order
            await PageObjects.observabilityLogExplorer.clickSortButtonBy('desc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(await menuEntries[0].getVisibleText()).to.be('error');
              expect(await menuEntries[1].getVisibleText()).to.be('access');
            });

            // Test back ascending order
            await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');
            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });
          });

          it('should filter the datasets list by the typed dataset name', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu)
                );

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              expect(await menuEntries[1].getVisibleText()).to.be('error');
            });

            await PageObjects.observabilityLogExplorer.typeSearchFieldWith('err');

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(menuEntries.length).to.be(1);
              expect(await menuEntries[0].getVisibleText()).to.be('error');
            });
          });

          it('should update the current selection with the clicked dataset', async () => {
            await retry.try(async () => {
              const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
              await nodes[0].click();
            });

            await retry.try(async () => {
              const panelTitleNode = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu)
                );

              expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            });

            await retry.try(async () => {
              const menuEntries = await PageObjects.observabilityLogExplorer
                .getIntegrationsContextMenu()
                .then((menu: WebElementWrapper) =>
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu)
                );

              expect(await menuEntries[0].getVisibleText()).to.be('access');
              menuEntries[0].click();
            });

            await retry.try(async () => {
              const selectorButton =
                await PageObjects.observabilityLogExplorer.getDatasetSelectorButton();

              expect(await selectorButton.getVisibleText()).to.be('[Apache HTTP Server] access');
            });
          });
        });
      });

      describe('when open on the uncategorized tab', () => {
        before(async () => {
          await PageObjects.observabilityLogExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();
          await PageObjects.observabilityLogExplorer
            .getUncategorizedTab()
            .then((tab: WebElementWrapper) => tab.click());
        });

        it('should display a list of available datasets', async () => {
          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu),
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
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          // Test ascending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          // Test descending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[2]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[0]);
          });

          // Test back ascending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });
        });

        it('should filter the datasets list by the typed dataset name', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('retail');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('retail');
          });
        });

        it('should update the current selection with the clicked dataset', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getUncategorizedContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const selectorButton =
              await PageObjects.observabilityLogExplorer.getDatasetSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be(expectedUncategorized[0]);
          });
        });
      });

      describe('when open on the data views tab', () => {
        before(async () => {
          await PageObjects.observabilityLogExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();
          await PageObjects.observabilityLogExplorer
            .getDataViewsTab()
            .then((tab: WebElementWrapper) => tab.click());
        });

        it('should display a list of available data views', async () => {
          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu),
                ])
              );

            expect(
              await PageObjects.observabilityLogExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
          });
        });

        it('should sort the data views list by the clicked sorting option', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          // Test descending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[2]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(sortedExpectedDataViews[0]);
          });

          // Test back ascending order
          await PageObjects.observabilityLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(sortedExpectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(sortedExpectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(sortedExpectedDataViews[2]);
          });
        });

        it('should filter the datasets list by the typed data view name', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[0].getVisibleText()).to.be(expectedDataViews[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedDataViews[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
          });

          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('logs');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(menuEntries.length).to.be(2);
            expect(await menuEntries[0].getVisibleText()).to.be('logs-*');
            expect(await menuEntries[1].getVisibleText()).to.be('logstash-*');
          });
        });

        it('should navigate to Discover with the clicked data view preselected', async () => {
          await retry.try(async () => {
            const panelTitleNode = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelTitle(menu)
              );

            expect(
              await PageObjects.observabilityLogExplorer.getDataViewsContextMenuTitle(
                panelTitleNode
              )
            ).to.be('Data Views');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getDataViewsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(await menuEntries[2].getVisibleText()).to.be(expectedDataViews[2]);
            menuEntries[2].click();
          });

          await retry.try(async () => {
            expect(await PageObjects.discover.getCurrentlySelectedDataView()).to.eql(
              expectedDataViews[2]
            );
          });
        });
      });

      describe('when open/close the selector', () => {
        before(async () => {
          await PageObjects.observabilityLogExplorer.navigateTo();
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();
        });

        it('should restore the latest navigation panel', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.observabilityLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogExplorer
              .getIntegrationsContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.observabilityLogExplorer.closeDatasetSelector();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogExplorer
              .getIntegrationsContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });
        });

        it('should restore the latest search results', async () => {
          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.observabilityLogExplorer.closeDatasetSelector();
          await PageObjects.observabilityLogExplorer.openDatasetSelector();

          await retry.try(async () => {
            const { integrations } = await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });
        });
      });

      describe('when switching between tabs or integration panels', () => {
        before(async () => {
          await PageObjects.observabilityLogExplorer.navigateTo();
        });

        it('should remember the latest search and restore its results', async () => {
          await PageObjects.observabilityLogExplorer.openDatasetSelector();
          await PageObjects.observabilityLogExplorer.clearSearchField();

          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('apache');

          await retry.try(async () => {
            const { nodes, integrations } =
              await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);
            nodes[0].click();
          });

          await retry.try(async () => {
            const [panelTitleNode, menuEntries] = await PageObjects.observabilityLogExplorer
              .getIntegrationsContextMenu()
              .then((menu: WebElementWrapper) =>
                Promise.all([
                  PageObjects.observabilityLogExplorer.getPanelTitle(menu),
                  PageObjects.observabilityLogExplorer.getPanelEntries(menu),
                ])
              );

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.observabilityLogExplorer.typeSearchFieldWith('err');

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getIntegrationsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });

          // Navigate back to integrations
          const panelTitleNode = await PageObjects.observabilityLogExplorer
            .getIntegrationsContextMenu()
            .then((menu: WebElementWrapper) =>
              PageObjects.observabilityLogExplorer.getPanelTitle(menu)
            );
          panelTitleNode.click();

          await retry.try(async () => {
            const { nodes, integrations } =
              await PageObjects.observabilityLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);

            const searchValue = await PageObjects.observabilityLogExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('apache');

            nodes[0].click();
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.observabilityLogExplorer
              .getIntegrationsContextMenu()
              .then((menu: WebElementWrapper) =>
                PageObjects.observabilityLogExplorer.getPanelEntries(menu)
              );

            const searchValue = await PageObjects.observabilityLogExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('err');

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });
        });
      });
    });
  });
}
