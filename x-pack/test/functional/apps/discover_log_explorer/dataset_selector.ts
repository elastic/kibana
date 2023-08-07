/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

interface IntegrationPackage {
  name: string;
  version: string;
}

const packages: IntegrationPackage[] = [
  {
    name: 'apache',
    version: '1.14.0',
  },
  {
    name: 'aws',
    version: '1.51.0',
  },
  {
    name: 'system',
    version: '1.38.1',
  },
  {
    name: '1password',
    version: '1.18.0',
  },
  {
    name: 'activemq',
    version: '0.13.0',
  },
  {
    name: 'airflow',
    version: '0.2.0',
  },
  {
    name: 'akamai',
    version: '2.14.0',
  },
  {
    name: 'apache_spark',
    version: '0.6.0',
  },
  {
    name: 'apache_tomcat',
    version: '0.12.1',
  },
  {
    name: 'apm',
    version: '8.10.0-preview-1689351101',
  },
  {
    name: 'arista_ngfw',
    version: '0.2.0',
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.14.0',
  },
  {
    name: 'atlassian_confluence',
    version: '1.15.0',
  },
  {
    name: 'atlassian_jira',
    version: '1.15.0',
  },
  {
    name: 'auditd',
    version: '3.12.0',
  },
  {
    name: 'auditd_manager',
    version: '1.12.0',
  },
  {
    name: 'auth0',
    version: '1.10.0',
  },
  {
    name: 'aws_logs',
    version: '0.5.0',
  },
  {
    name: 'awsfargate',
    version: '0.3.0',
  },
  {
    name: 'azure',
    version: '1.5.28',
  },
  {
    name: 'azure_app_service',
    version: '0.0.1',
  },
  {
    name: 'azure_application_insights',
    version: '1.0.6',
  },
  {
    name: 'azure_billing',
    version: '1.1.3',
  },
  {
    name: 'azure_blob_storage',
    version: '0.5.0',
  },
  {
    name: 'azure_frontdoor',
    version: '1.1.0',
  },
  {
    name: 'azure_functions',
    version: '0.0.1',
  },
  {
    name: 'azure_metrics',
    version: '1.0.17',
  },
  {
    name: 'barracuda',
    version: '1.5.0',
  },
  {
    name: 'barracuda_cloudgen_firewall',
    version: '1.5.0',
  },
  {
    name: 'beat',
    version: '0.1.3',
  },
  {
    name: 'bitdefender',
    version: '1.2.0',
  },
  {
    name: 'bitwarden',
    version: '1.2.0',
  },
  {
    name: 'bluecoat',
    version: '0.17.0',
  },
  {
    name: 'box_events',
    version: '1.7.0',
  },
  {
    name: 'carbon_black_cloud',
    version: '1.13.0',
  },
];

const initialPackages = packages.slice(0, 3);
const initialPackageMap = {
  apache: 'Apache HTTP Server',
  aws: 'AWS',
  system: 'System',
};
const initialPackagesTexts = Object.values(initialPackageMap);

const additionalPackages = packages.slice(3);

export default function (providerContext: FtrProviderContext) {
  const { getService, getPageObjects } = providerContext;
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['common', 'discoverLogExplorer']);

  const supertest = getService('supertest');
  const browser = getService('browser');

  const uninstallPackage = ({ name, version }: IntegrationPackage) => {
    return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = ({ name, version }: IntegrationPackage) => {
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Dataset Selector', () => {
    describe('without installed integrations or uncategorized data streams', () => {
      before(async () => {
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
      });

      beforeEach(async () => {
        await PageObjects.discoverLogExplorer.openDatasetSelector();
      });

      afterEach(async () => {
        await PageObjects.discoverLogExplorer.closeDatasetSelector();
      });

      describe('when open on the first navigation level', () => {
        it('should always display the all log datasets entry as first item', async () => {
          const allLogDatasetButton =
            await PageObjects.discoverLogExplorer.getAllLogDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const allLogDatasetTitle = await allLogDatasetButton.getVisibleText();
          const firstEntryTitle = await menuEntries[0].getVisibleText();

          expect(allLogDatasetTitle).to.be('All log datasets');
          expect(allLogDatasetTitle).to.be(firstEntryTitle);
        });

        it('should always display the unmanaged datasets entry as second item', async () => {
          const unamanagedDatasetButton =
            await PageObjects.discoverLogExplorer.getUnmanagedDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const unmanagedDatasetTitle = await unamanagedDatasetButton.getVisibleText();
          const secondEntryTitle = await menuEntries[1].getVisibleText();

          expect(unmanagedDatasetTitle).to.be('Uncategorized');
          expect(unmanagedDatasetTitle).to.be(secondEntryTitle);
        });

        it('should display an empty prompt for no integrations', async () => {
          const { integrations } = await PageObjects.discoverLogExplorer.getIntegrations();
          expect(integrations.length).to.be(0);

          await PageObjects.discoverLogExplorer.assertNoIntegrationsPromptExists();
        });
      });

      describe('when navigating into Uncategorized data streams', () => {
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
      before(async () => {
        await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
        await esArchiver.load(
          'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
        );
        logger.info(`Installing ${initialPackages.length} integration packages.`);
        await Promise.all(initialPackages.map(installPackage));
        await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });
      });

      after(async () => {
        await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
        await esArchiver.unload(
          'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
        );

        logger.info(`Uninstalling ${initialPackages.length} integration packages.`);
        await Promise.all(initialPackages.map(uninstallPackage));
      });

      describe('when open on the first navigation level', () => {
        beforeEach(async () => {
          await PageObjects.discoverLogExplorer.openDatasetSelector();
          await PageObjects.discoverLogExplorer.clearSearchField();
        });

        afterEach(async () => {
          await PageObjects.discoverLogExplorer.clearSearchField();
          await PageObjects.discoverLogExplorer.closeDatasetSelector();
        });

        it('should always display the all log datasets entry as first item', async () => {
          const allLogDatasetButton =
            await PageObjects.discoverLogExplorer.getAllLogDatasetsButton();
          const menuEntries = await PageObjects.discoverLogExplorer.getCurrentPanelEntries();

          const allLogDatasetTitle = await allLogDatasetButton.getVisibleText();
          const firstEntryTitle = await menuEntries[0].getVisibleText();

          expect(allLogDatasetTitle).to.be('All log datasets');
          expect(allLogDatasetTitle).to.be(firstEntryTitle);
        });

        it('should always display the unmanaged datasets entry as second item', async () => {
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

        it('should load more integrations scrolling to the end of the list', async () => {
          // Install more integrations and reload the page
          logger.info(`Installing ${additionalPackages.length} integration packages.`);
          await Promise.all(additionalPackages.map(installPackage));
          await PageObjects.common.navigateToApp('discover', { hash: '/p/log-explorer' });

          await PageObjects.discoverLogExplorer.openDatasetSelector();

          await retry.try(async () => {
            const { nodes } = await PageObjects.discoverLogExplorer.getIntegrations();
            expect(nodes.length).to.be(15);
            await nodes.at(-1)?.scrollIntoViewIfNecessary();
          });

          logger.info(`Uninstalling ${additionalPackages.length} integration packages.`);
          await Promise.all(additionalPackages.map(uninstallPackage));
        });
      });

      // describe('when click on an integration and moves into the second navigation level', () => {});

      describe('when open/close the selector', () => {
        it('should restore the latest navigation panel', async () => {
          await PageObjects.discoverLogExplorer.openDatasetSelector();
          await PageObjects.discoverLogExplorer.clearSearchField();

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
      });
    });
  });
}
