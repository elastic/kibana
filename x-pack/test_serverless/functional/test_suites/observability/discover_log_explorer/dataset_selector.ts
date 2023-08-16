/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const initialPackageMap = {
  apache: 'Apache HTTP Server',
  aws: 'AWS',
  system: 'System',
};
const initialPackagesTexts = Object.values(initialPackageMap);

const expectedUncategorized = ['logs-gaming-*', 'logs-manufacturing-*', 'logs-retail-*'];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discoverLogExplorer']);

  describe('Dataset Selector', () => {
    before(async () => {
      await PageObjects.discoverLogExplorer.removeInstalledPackages();
    });

    describe('without installed integrations or uncategorized data streams', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
      });

      beforeEach(async () => {
        await browser.refresh();
        await PageObjects.discoverLogExplorer.openDatasetSelector();
      });

      describe('when open on the first navigation level', () => {
        it('should always display the "All log datasets" entry as the first item', async () => {
          const allLogDatasetButton =
            await PageObjects.discoverLogExplorer.getAllLogDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const allLogDatasetTitle = await allLogDatasetButton.getVisibleText();
          const firstEntryTitle = await menuEntries[0].getVisibleText();

          expect(allLogDatasetTitle).to.be('All log datasets');
          expect(allLogDatasetTitle).to.be(firstEntryTitle);
        });

        it('should always display the unmanaged datasets entry as the second item', async () => {
          const unamanagedDatasetButton =
            await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const unmanagedDatasetTitle = await unamanagedDatasetButton.getVisibleText();
          const secondEntryTitle = await menuEntries[1].getVisibleText();

          expect(unmanagedDatasetTitle).to.be('Uncategorized');
          expect(unmanagedDatasetTitle).to.be(secondEntryTitle);
        });

        it('should display an error prompt if could not retrieve the integrations', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await retry.try(async () => {
              await PageObjects.discoverLogExplorer.assertNoIntegrationsPromptExists();
            });

            await PageObjects.common.sleep(5000);
            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.discoverLogExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.discoverLogExplorer.assertNoIntegrationsErrorExists();
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no integrations', async () => {
          const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
          expect(integrations.length).to.be(0);

          await PageObjects.discoverLogExplorer.assertNoIntegrationsPromptExists();
        });
      });

      describe('when navigating into Uncategorized data streams', () => {
        it('should display a loading skeleton while loading', async function () {
          // Skip the test in case network condition utils are not available
          try {
            await browser.setNetworkConditions('SLOW_3G'); // Almost stuck network conditions
            const unamanagedDatasetButton =
              await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
            await unamanagedDatasetButton.click();

            await PageObjects.discoverLogExplorer.assertLoadingSkeletonExists();

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an error prompt if could not retrieve the data streams', async function () {
          // Skip the test in case network condition utils are not available
          try {
            const unamanagedDatasetButton =
              await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
            await unamanagedDatasetButton.click();

            await retry.try(async () => {
              await PageObjects.discoverLogExplorer.assertNoDataStreamsPromptExists();
            });

            await browser.setNetworkConditions('OFFLINE');
            await PageObjects.discoverLogExplorer.typeSearchFieldWith('a');

            await retry.try(async () => {
              await PageObjects.discoverLogExplorer.assertNoDataStreamsErrorExists();
            });

            await browser.restoreNetworkConditions();
          } catch (error) {
            this.skip();
          }
        });

        it('should display an empty prompt for no data streams', async () => {
          const unamanagedDatasetButton =
            await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          await unamanagedDatasetButton.click();

          const unamanagedDatasetEntries =
            await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          expect(unamanagedDatasetEntries.length).to.be(0);

          await PageObjects.discoverLogExplorer.assertNoDataStreamsPromptExists();
        });
      });
    });

    describe('with installed integrations and uncategorized data streams', () => {
      let cleanupIntegrationsSetup: () => Promise<void>;

      before(async () => {
        await esArchiver.load(
          'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
        );
        cleanupIntegrationsSetup = await PageObjects.discoverLogExplorer.setupInitialIntegrations();
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
        );
        await cleanupIntegrationsSetup();
      });

      describe('when open on the first navigation level', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.discoverLogExplorer.openDatasetSelector();
        });

        it('should always display the "All log datasets" entry as the first item', async () => {
          const allLogDatasetButton =
            await PageObjects.discoverLogExplorer.getAllLogDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const allLogDatasetTitle = await allLogDatasetButton.getVisibleText();
          const firstEntryTitle = await menuEntries[0].getVisibleText();

          expect(allLogDatasetTitle).to.be('All log datasets');
          expect(allLogDatasetTitle).to.be(firstEntryTitle);
        });

        it('should always display the unmanaged datasets entry as the second item', async () => {
          const unamanagedDatasetButton =
            await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const unmanagedDatasetTitle = await unamanagedDatasetButton.getVisibleText();
          const secondEntryTitle = await menuEntries[1].getVisibleText();

          expect(unmanagedDatasetTitle).to.be('Uncategorized');
          expect(unmanagedDatasetTitle).to.be(secondEntryTitle);
        });

        it('should display a list of installed integrations', async () => {
          const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();

          expect(integrations.length).to.be(3);
          expect(integrations).to.eql(initialPackagesTexts);
        });

        it('should sort the integrations list by the clicked sorting option', async () => {
          // Test ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });

          // Test descending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('desc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts.slice().reverse());
          });

          // Test back ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql(initialPackagesTexts);
          });
        });

        it('should filter the integrations list by the typed integration name', async () => {
          await PageObjects.discoverLogExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.discoverLogExplorer.typeSearchFieldWith('a');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache, initialPackageMap.aws]);
          });
        });

        it('should display an empty prompt when the search does not match any result', async () => {
          await PageObjects.discoverLogExplorer.typeSearchFieldWith('no result search text');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations.length).to.be(0);
          });

          await PageObjects.discoverLogExplorer.assertNoIntegrationsPromptExists();
        });

        it('should load more integrations by scrolling to the end of the list', async () => {
          // Install more integrations and reload the page
          const cleanupAdditionalSetup =
            await PageObjects.discoverLogExplorer.setupAdditionalIntegrations();
          await browser.refresh();

          await PageObjects.discoverLogExplorer.openDatasetSelector();

          // Initially fetched integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(nodes.length).to.be(15);
            await nodes.at(-1)?.scrollIntoViewIfNecessary();
          });

          // Load more integrations
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
            await nodes.at(-1)?.scrollIntoViewIfNecessary();
          });

          // No other integrations to load after scrolling to last integration
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(nodes.length).to.be(20);
          });

          cleanupAdditionalSetup();
        });
      });

      describe('when clicking on integration and moving into the second navigation level', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.discoverLogExplorer.openDatasetSelector();
        });

        it('should display a list of available datasets', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });
        });

        it('should sort the datasets list by the clicked sorting option', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
          });

          // Test ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          // Test descending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('error');
            expect(await menuEntries[1].getVisibleText()).to.be('access');
          });

          // Test back ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });
        });

        it('should filter the datasets list by the typed dataset name', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.discoverLogExplorer.typeSearchFieldWith('err');

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });
        });

        it('should update the current selection with the clicked dataset', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('access');
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const selectorButton = await PageObjects.discoverLogExplorer.getDatasetSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be('[Apache HTTP Server] access');
          });
        });
      });

      describe('when navigating into Uncategorized data streams', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.discoverLogExplorer.openDatasetSelector();
        });

        it('should display a list of available datasets', async () => {
          const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          await button.click();

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });
        });

        it('should sort the datasets list by the clicked sorting option', async () => {
          const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          await button.click();

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          // Test ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          // Test descending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('desc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[2]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[0]);
          });

          // Test back ascending order
          await PageObjects.discoverLogExplorer.clickSortButtonBy('asc');
          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });
        });

        it('should filter the datasets list by the typed dataset name', async () => {
          const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          await button.click();

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be(expectedUncategorized[0]);
            expect(await menuEntries[1].getVisibleText()).to.be(expectedUncategorized[1]);
            expect(await menuEntries[2].getVisibleText()).to.be(expectedUncategorized[2]);
          });

          await PageObjects.discoverLogExplorer.typeSearchFieldWith('retail');

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('logs-retail-*');
          });
        });

        it('should update the current selection with the clicked dataset', async () => {
          const button = await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          await button.click();

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();

            expect(await panelTitleNode.getVisibleText()).to.be('Uncategorized');
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await menuEntries[0].getVisibleText()).to.be('logs-gaming-*');
            menuEntries[0].click();
          });

          await retry.try(async () => {
            const selectorButton = await PageObjects.discoverLogExplorer.getDatasetSelectorButton();

            expect(await selectorButton.getVisibleText()).to.be('logs-gaming-*');
          });
        });
      });

      describe('when open/close the selector', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        });

        beforeEach(async () => {
          await browser.refresh();
          await PageObjects.discoverLogExplorer.openDatasetSelector();
        });

        it('should restore the latest navigation panel', async () => {
          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            await nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.discoverLogExplorer.closeDatasetSelector();
          await PageObjects.discoverLogExplorer.openDatasetSelector();

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });
        });

        it('should restore the latest search results', async () => {
          await PageObjects.discoverLogExplorer.typeSearchFieldWith('system');

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });

          await PageObjects.discoverLogExplorer.closeDatasetSelector();
          await PageObjects.discoverLogExplorer.openDatasetSelector();

          await retry.try(async () => {
            const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.system]);
          });
        });
      });

      describe('when switching between integration panels', () => {
        before(async () => {
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
        });

        it('should remember the latest search and restore its results for each integration', async () => {
          await PageObjects.discoverLogExplorer.openDatasetSelector();
          await PageObjects.discoverLogExplorer.clearSearchField();

          await PageObjects.discoverLogExplorer.typeSearchFieldWith('apache');

          await retry.try(async () => {
            const { nodes, integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);
            nodes[0].click();
          });

          await retry.try(async () => {
            const panelTitleNode =
              await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(await panelTitleNode.getVisibleText()).to.be('Apache HTTP Server');
            expect(await menuEntries[0].getVisibleText()).to.be('access');
            expect(await menuEntries[1].getVisibleText()).to.be('error');
          });

          await PageObjects.discoverLogExplorer.typeSearchFieldWith('err');

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });

          // Navigate back to integrations
          const panelTitleNode =
            await PageObjects.discoverLogExplorer.getDatasetSelectorContextMenuPanelTitle();
          panelTitleNode.click();

          await retry.try(async () => {
            const { nodes, integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(integrations).to.eql([initialPackageMap.apache]);

            const searchValue = await PageObjects.discoverLogExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('apache');

            nodes[0].click();
          });

          await retry.try(async () => {
            const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

            const searchValue = await PageObjects.discoverLogExplorer.getSearchFieldValue();
            expect(searchValue).to.eql('err');

            expect(menuEntries.length).to.be(1);
            expect(await menuEntries[0].getVisibleText()).to.be('error');
          });
        });
      });
    });
  });
}
