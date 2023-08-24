/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export interface IntegrationPackage {
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
    name: 'akamai',
    version: '2.14.0',
  },
  {
    name: 'apache_tomcat',
    version: '0.12.1',
  },
  {
    name: 'apm',
    version: '8.4.2',
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
    name: 'azure',
    version: '1.5.28',
  },
  {
    name: 'azure_app_service',
    version: '0.0.1',
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
];

const initialPackages = packages.slice(0, 3);
const additionalPackages = packages.slice(3);

export function ObservabilityLogExplorerPageObject({ getService }: FtrProviderContext) {
  const log = getService('log');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  return {
    uninstallPackage: ({ name, version }: IntegrationPackage) => {
      return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
    },

    installPackage: ({ name, version }: IntegrationPackage) => {
      return supertest
        .post(`/api/fleet/epm/packages/${name}/${version}`)
        .set('kbn-xsrf', 'xxxx')
        .send({ force: true });
    },

    getInstalledPackages: () => {
      return supertest
        .get(`/api/fleet/epm/packages/installed?dataStreamType=logs&perPage=1000`)
        .set('kbn-xsrf', 'xxxx');
    },

    async removeInstalledPackages(): Promise<IntegrationPackage[]> {
      const response = await this.getInstalledPackages();

      // Uninstall installed integration
      await Promise.all(
        response.body.items.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
      );

      return response.body.items;
    },

    async setupInitialIntegrations() {
      log.info(`===== Setup initial integration packages. =====`);
      log.info(`===== Uninstall initial integration packages. =====`);
      const uninstalled = await this.removeInstalledPackages();
      log.info(`===== Install ${initialPackages.length} mock integration packages. =====`);
      await Promise.all(initialPackages.map((pkg: IntegrationPackage) => this.installPackage(pkg)));

      return async () => {
        log.info(`===== Uninstall ${initialPackages.length} mock integration packages. =====`);
        await Promise.all(
          initialPackages.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
        );
        log.info(`===== Restore pre-existing integration packages. =====`);
        await Promise.all(uninstalled.map((pkg: IntegrationPackage) => this.installPackage(pkg)));
      };
    },

    async setupAdditionalIntegrations() {
      log.info(`===== Setup additional integration packages. =====`);
      log.info(`===== Install ${additionalPackages.length} mock integration packages. =====`);
      await Promise.all(
        additionalPackages.map((pkg: IntegrationPackage) => this.installPackage(pkg))
      );

      return async () => {
        log.info(`===== Uninstall ${additionalPackages.length} mock integration packages. =====`);
        await Promise.all(
          additionalPackages.map((pkg: IntegrationPackage) => this.uninstallPackage(pkg))
        );
      };
    },

    getDatasetSelector() {
      return testSubjects.find('datasetSelectorPopover');
    },

    getDatasetSelectorButton() {
      return testSubjects.find('datasetSelectorPopoverButton');
    },

    getDatasetSelectorContent() {
      return testSubjects.find('datasetSelectorContent');
    },

    getDatasetSelectorSearchControls() {
      return testSubjects.find('datasetSelectorSearchControls');
    },

    getDatasetSelectorContextMenu() {
      return testSubjects.find('datasetSelectorContextMenu');
    },

    getDatasetSelectorContextMenuPanelTitle() {
      return testSubjects.find('contextMenuPanelTitleButton');
    },

    async getDatasetSelectorButtonText() {
      const button = await this.getDatasetSelectorButton();
      return button.getVisibleText();
    },

    async getCurrentPanelEntries() {
      const contextMenu = await this.getDatasetSelectorContextMenu();
      return contextMenu.findAllByClassName('euiContextMenuItem', 2000);
    },

    getAllLogDatasetsButton() {
      return testSubjects.find('allLogDatasets');
    },

    getUnmanagedDatasetsButton() {
      return testSubjects.find('unmanagedDatasets');
    },

    async getIntegrations() {
      const content = await this.getDatasetSelectorContent();

      const nodes = await content.findAllByCssSelector('[data-test-subj*="integration-"]', 2000);
      const integrations = await Promise.all(nodes.map((node) => node.getVisibleText()));

      return {
        nodes,
        integrations,
      };
    },

    async openDatasetSelector() {
      const button = await this.getDatasetSelectorButton();
      return button.click();
    },

    async closeDatasetSelector() {
      const button = await this.getDatasetSelectorButton();
      const isOpen = await testSubjects.exists('datasetSelectorContent');

      if (isOpen) return button.click();
    },

    async clickSortButtonBy(direction: 'asc' | 'desc') {
      const titleMap = {
        asc: 'Ascending',
        desc: 'Descending',
      };
      const searchControlsContainer = await this.getDatasetSelectorSearchControls();
      const sortingButton = await searchControlsContainer.findByCssSelector(
        `[title=${titleMap[direction]}]`
      );

      return sortingButton.click();
    },

    async getSearchFieldValue() {
      const searchControlsContainer = await this.getDatasetSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      return searchField.getAttribute('value');
    },

    async typeSearchFieldWith(name: string) {
      const searchControlsContainer = await this.getDatasetSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      await searchField.clearValueWithKeyboard();
      return searchField.type(name);
    },

    async clearSearchField() {
      const searchControlsContainer = await this.getDatasetSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      return searchField.clearValueWithKeyboard();
    },

    async assertRestoreFailureToastExist() {
      const successToast = await toasts.getToastElement(1);
      expect(await successToast.getVisibleText()).to.contain(
        "We couldn't restore your datasets selection"
      );
    },

    assertLoadingSkeletonExists() {
      return testSubjects.existOrFail('datasetSelectorSkeleton');
    },

    async assertNoIntegrationsPromptExists() {
      const integrationStatus = await testSubjects.find('integrationStatusItem');
      const promptTitle = await integrationStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be('No integrations found');
    },

    async assertNoIntegrationsErrorExists() {
      const integrationStatus = await testSubjects.find('integrationsErrorPrompt');
      const promptTitle = await integrationStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be('No integrations found');
    },

    async assertNoDataStreamsPromptExists() {
      const integrationStatus = await testSubjects.find('emptyDatasetPrompt');
      const promptTitle = await integrationStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be('No data streams found');
    },

    async assertNoDataStreamsErrorExists() {
      const integrationStatus = await testSubjects.find('datasetErrorPrompt');
      const promptTitle = await integrationStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be('No data streams found');
    },
  };
}
