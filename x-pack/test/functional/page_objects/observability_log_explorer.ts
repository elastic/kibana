/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { extractTimeFields } from '@kbn/data-view-editor-plugin/public/lib';
import expect from '@kbn/expect';
import rison from '@kbn/rison';
import querystring from 'querystring';
import { WebElementWrapper } from '../../../../test/functional/services/lib/web_element_wrapper';
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

const FROM = '2023-08-03T10:24:14.035Z';
const TO = '2023-08-03T10:24:14.091Z';

export function ObservabilityLogExplorerPageObject({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const es = getService('es');
  const log = getService('log');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  type NavigateToAppOptions = Omit<
    Parameters<typeof PageObjects['common']['navigateToApp']>[1],
    'search'
  > & {
    search?: Record<string, string>;
    from?: string;
    to?: string;
  };

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

    async setupDataStream(datasetName: string, namespace: string = 'default') {
      log.info(`===== Setup initial data stream "${datasetName}". =====`);
      const dataStream = `logs-${datasetName}-${namespace}`;
      await es.indices.createDataStream({ name: dataStream });

      return async () => {
        log.info(`===== Removing data stream "${datasetName}". =====`);
        await es.indices.deleteDataStream({
          name: dataStream,
        });
      };
    },

    ingestLogEntries(dataStream: string, docs: MockLogDoc[] = []) {
      log.info(`===== Ingesting ${docs.length} docs for "${dataStream}" data stream. =====`);
      return es.bulk({
        body: docs.flatMap((doc) => [{ create: { _index: dataStream } }, createLogDoc(doc)]),
        refresh: 'wait_for',
      });
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

    async navigateTo(options: NavigateToAppOptions = {}) {
      const { search = {}, from = FROM, to = TO, ...extraOptions } = options;
      const composedSearch = querystring.stringify({
        ...search,
        _g: rison.encode({
          time: { from, to },
        }),
      });

      return await PageObjects.common.navigateToApp('observabilityLogExplorer', {
        search: composedSearch,
        ...extraOptions,
      });
    },

    getDatasetSelector() {
      return testSubjects.find('datasetSelectorPopover');
    },

    getDatasetSelectorButton() {
      return testSubjects.find('datasetSelectorPopoverButton', 120000); // Increase timeout if refresh takes longer before opening the selector
    },

    getDatasetSelectorContent() {
      return testSubjects.find('datasetSelectorContent');
    },

    getDatasetSelectorSearchControls() {
      return testSubjects.find('datasetSelectorSearchControls');
    },

    getIntegrationsContextMenu() {
      return testSubjects.find('integrationsContextMenu');
    },

    getIntegrationsTab() {
      return testSubjects.find('datasetSelectorIntegrationsTab');
    },

    getUncategorizedContextMenu() {
      return testSubjects.find('uncategorizedContextMenu');
    },

    getUncategorizedTab() {
      return testSubjects.find('datasetSelectorUncategorizedTab');
    },

    getDataViewsContextMenu() {
      return testSubjects.find('dataViewsContextMenu');
    },

    getDataViewsContextMenuTitle(panelTitleNode: WebElementWrapper) {
      return panelTitleNode.getVisibleText().then((title) => title.split('\n')[0]);
    },

    getDataViewsTab() {
      return testSubjects.find('datasetSelectorDataViewsTab');
    },

    getPanelTitle(contextMenu: WebElementWrapper) {
      return contextMenu.findByClassName('euiContextMenuPanelTitle');
    },

    async getDatasetSelectorButtonText() {
      const button = await this.getDatasetSelectorButton();
      return button.getVisibleText();
    },

    getPanelEntries(contextMenu: WebElementWrapper) {
      return contextMenu.findAllByCssSelector('.euiContextMenuItem:not([disabled])', 2000);
    },

    getAllLogDatasetsButton() {
      return testSubjects.find('datasetSelectorshowAllLogs');
    },

    getUnmanagedDatasetsButton() {
      return testSubjects.find('unmanagedDatasets');
    },

    async getFlyoutDetail(docPos: number = 0) {
      await this.openLogFlyout(docPos);
      return testSubjects.find('logExplorerFlyoutDetail');
    },

    async getIntegrations() {
      const menu = await this.getIntegrationsContextMenu();

      const nodes = await menu.findAllByCssSelector('[data-test-subj*="integration-"]', 2000);
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

    async openLogFlyout(docPos: number = 0) {
      const docEntries = await testSubjects.findAll('docTableExpandToggleColumn');
      const selectedDoc = docEntries[docPos];
      if (selectedDoc) {
        await selectedDoc.click();
      }
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
      return searchField.type(name, { charByChar: true });
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

    async assertListStatusEmptyPromptExistsWithTitle(title: string) {
      const [listStatus] = await testSubjects.findAll('datasetSelectorListStatusEmptyPrompt');
      const promptTitle = await listStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be(title);
    },

    async assertListStatusErrorPromptExistsWithTitle(title: string) {
      const listStatus = await testSubjects.find('datasetSelectorListStatusErrorPrompt');
      const promptTitle = await listStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be(title);
    },

    getHeaderMenu() {
      return testSubjects.find('logExplorerHeaderMenu');
    },

    getDiscoverFallbackLink() {
      return testSubjects.find('logExplorerDiscoverFallbackLink');
    },

    getOnboardingLink() {
      return testSubjects.find('logExplorerOnboardingLink');
    },

    // Query Bar
    getQueryBar() {
      return testSubjects.find('queryInput');
    },

    async getQueryBarValue() {
      const queryBar = await testSubjects.find('queryInput');
      return queryBar.getAttribute('value');
    },

    async typeInQueryBar(query: string) {
      const queryBar = await this.getQueryBar();
      await queryBar.clearValueWithKeyboard();
      return queryBar.type(query);
    },

    async submitQuery(query: string) {
      await this.typeInQueryBar(query);
      await testSubjects.click('querySubmitButton');
    },
  };
}

interface MockLogDoc {
  time: number;
  logFilepath: string;
  serviceName?: string;
  namespace: string;
  datasetName: string;
  message?: string;
  logLevel?: string;
  [key: string]: unknown;
}

export function createLogDoc({
  time,
  logFilepath,
  serviceName,
  namespace,
  datasetName,
  message,
  logLevel,
  ...extraFields
}: MockLogDoc) {
  return {
    input: {
      type: 'log',
    },
    '@timestamp': new Date(time).toISOString(),
    log: {
      file: {
        path: logFilepath,
      },
    },
    ...(serviceName
      ? {
          service: {
            name: serviceName,
          },
        }
      : {}),
    data_stream: {
      namespace,
      type: 'logs',
      dataset: datasetName,
    },
    message,
    event: {
      dataset: datasetName,
    },
    ...(logLevel && { 'log.level': logLevel }),
    ...extraFields,
  };
}
