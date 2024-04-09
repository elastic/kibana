/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY,
  logsExplorerUrlSchemaV2,
} from '@kbn/observability-logs-explorer-plugin/common';
import rison from '@kbn/rison';
import querystring from 'querystring';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
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

const defaultPageState: logsExplorerUrlSchemaV2.UrlSchema = {
  v: 2,
  time: {
    from: '2023-08-03T10:24:14.035Z',
    to: '2023-08-03T10:24:14.091Z',
    mode: 'absolute',
  },
};

export function ObservabilityLogsExplorerPageObject({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['common']);
  const dataGrid = getService('dataGrid');
  const es = getService('es');
  const log = getService('log');
  const queryBar = getService('queryBar');
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

    async setupDataStream(datasetName: string, namespace: string = 'default') {
      const dataStream = `logs-${datasetName}-${namespace}`;
      log.info(`===== Setup initial data stream "${dataStream}". =====`);
      await es.indices.createDataStream({ name: dataStream });

      return async () => {
        log.info(`===== Removing data stream "${dataStream}". =====`);
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

    async navigateTo({
      pageState,
    }: {
      pageState?: logsExplorerUrlSchemaV2.UrlSchema;
    } = {}) {
      const queryStringParams = querystring.stringify({
        [OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY]: rison.encode(
          logsExplorerUrlSchemaV2.urlSchemaRT.encode({
            ...defaultPageState,
            ...pageState,
          })
        ),
      });

      return await PageObjects.common.navigateToUrlWithBrowserHistory(
        'observabilityLogsExplorer',
        '/',
        queryStringParams,
        {
          // the check sometimes is too slow for the page so it misses the point
          // in time before the app rewrites the URL
          ensureCurrentUrl: false,
        }
      );
    },

    async navigateToWithUncheckedState({
      pageState: uncheckedPageState,
    }: {
      pageState?: {};
    } = {}) {
      const queryStringParams = querystring.stringify({
        [OBSERVABILITY_LOGS_EXPLORER_URL_STATE_KEY]: rison.encode({
          ...uncheckedPageState,
        }),
      });

      log.info('queryStringParams');

      return await PageObjects.common.navigateToUrlWithBrowserHistory(
        'observabilityLogsExplorer',
        '/',
        queryStringParams,
        {
          // the check sometimes is too slow for the page so it misses the point
          // in time before the app rewrites the URL
          ensureCurrentUrl: false,
        }
      );
    },

    getDataSourceSelector() {
      return testSubjects.find('dataSourceSelectorPopover');
    },

    getDataSourceSelectorButton() {
      return testSubjects.find('dataSourceSelectorPopoverButton', 120000); // Increase timeout if refresh takes longer before opening the selector
    },

    getDataSourceSelectorContent() {
      return testSubjects.find('dataSourceSelectorContent');
    },

    getDataSourceSelectorSearchControls() {
      return testSubjects.find('dataSourceSelectorSearchControls');
    },

    getIntegrationsContextMenu() {
      return testSubjects.find('integrationsContextMenu');
    },

    getIntegrationsTab() {
      return testSubjects.find('dataSourceSelectorIntegrationsTab');
    },

    getUncategorizedContextMenu() {
      return testSubjects.find('uncategorizedContextMenu');
    },

    getUncategorizedTab() {
      return testSubjects.find('dataSourceSelectorUncategorizedTab');
    },

    getDataViewsContextMenu() {
      return testSubjects.find('dataViewsContextMenu');
    },

    getDataViewsTab() {
      return testSubjects.find('dataSourceSelectorDataViewsTab');
    },

    async changeDataViewTypeFilter(type: 'All' | 'Logs') {
      const menuButton = await testSubjects.find(
        'logsExplorerDataSourceSelectorDataViewTypeButton'
      );
      await menuButton.click();
      const targetOption = await testSubjects.find(
        `logsExplorerDataSourceSelectorDataViewType${type}`
      );
      await targetOption.click();
    },

    getPanelTitle(contextMenu: WebElementWrapper) {
      return contextMenu.findByClassName('euiContextMenuPanel__title');
    },

    async getDataSourceSelectorButtonText() {
      const button = await this.getDataSourceSelectorButton();
      return button.getVisibleText();
    },

    getPanelEntries(contextMenu: WebElementWrapper) {
      return contextMenu.findAllByCssSelector(
        'button.euiContextMenuItem:not([disabled]):not([data-test-subj="contextMenuPanelTitleButton"])',
        2000
      );
    },

    getAllLogsButton() {
      return testSubjects.find('dataSourceSelectorShowAllLogs');
    },

    getUnmanagedDatasetsButton() {
      return testSubjects.find('unmanagedDatasets');
    },

    async getFlyoutDetail(rowIndex: number = 0) {
      await dataGrid.clickRowToggle({ rowIndex });
      return testSubjects.find('logsExplorerFlyoutDetail');
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

    async openDataSourceSelector() {
      const button = await this.getDataSourceSelectorButton();
      return button.click();
    },

    async closeDataSourceSelector() {
      const button = await this.getDataSourceSelectorButton();
      const isOpen = await testSubjects.exists('dataSourceSelectorContent');

      if (isOpen) return button.click();
    },

    async clickSortButtonBy(direction: 'asc' | 'desc') {
      const titleMap = {
        asc: 'Ascending',
        desc: 'Descending',
      };
      const searchControlsContainer = await this.getDataSourceSelectorSearchControls();
      const sortingButton = await searchControlsContainer.findByCssSelector(
        `[title=${titleMap[direction]}]`
      );

      return sortingButton.click();
    },

    async getSearchFieldValue() {
      const searchControlsContainer = await this.getDataSourceSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      return searchField.getAttribute('value');
    },

    async typeSearchFieldWith(name: string) {
      const searchControlsContainer = await this.getDataSourceSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      await searchField.clearValueWithKeyboard();
      return searchField.type(name, { charByChar: true });
    },

    async clearSearchField() {
      const searchControlsContainer = await this.getDataSourceSelectorSearchControls();
      const searchField = await searchControlsContainer.findByCssSelector('input[type=search]');

      return searchField.clearValueWithKeyboard();
    },

    async assertRestoreFailureToastExist() {
      const successToast = await toasts.getElementByIndex(1);
      expect(await successToast.getVisibleText()).to.contain('Error restoring state from URL');
    },

    assertLoadingSkeletonExists() {
      return testSubjects.existOrFail('dataSourceSelectorSkeleton');
    },

    async assertListStatusEmptyPromptExistsWithTitle(title: string) {
      const [listStatus] = await testSubjects.findAll('dataSourceSelectorListStatusEmptyPrompt');
      const promptTitle = await listStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be(title);
    },

    async assertListStatusErrorPromptExistsWithTitle(title: string) {
      const listStatus = await testSubjects.find('dataSourceSelectorListStatusErrorPrompt');
      const promptTitle = await listStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be(title);
    },

    getHeaderMenu() {
      return testSubjects.find('logsExplorerHeaderMenu');
    },

    getDiscoverFallbackLink() {
      return testSubjects.find('logsExplorerDiscoverFallbackLink');
    },

    getOnboardingLink() {
      return testSubjects.find('logsExplorerOnboardingLink');
    },

    // Query Bar
    getQueryBarValue() {
      return queryBar.getQueryString();
    },

    async submitQuery(query: string) {
      await queryBar.setQuery(query);
      await queryBar.clickQuerySubmitButton();
    },
  };
}

interface MockLogDoc {
  time: number;
  logFilepath?: string;
  serviceName?: string;
  namespace: string;
  datasetName: string;
  message?: string;
  logLevel?: string;
  traceId?: string;
  hostName?: string;
  orchestratorClusterId?: string;
  orchestratorClusterName?: string;
  orchestratorResourceId?: string;
  cloudProvider?: string;
  cloudRegion?: string;
  cloudAz?: string;
  cloudProjectId?: string;
  cloudInstanceId?: string;
  agentName?: string;

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
  traceId,
  hostName,
  orchestratorClusterId,
  orchestratorClusterName,
  orchestratorResourceId,
  cloudProvider,
  cloudRegion,
  cloudAz,
  cloudProjectId,
  cloudInstanceId,
  agentName,
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
    ...(traceId && { 'trace.id': traceId }),
    ...(hostName && { 'host.name': hostName }),
    ...(orchestratorClusterId && { 'orchestrator.cluster.id': orchestratorClusterId }),
    ...(orchestratorClusterName && { 'orchestrator.cluster.name': orchestratorClusterName }),
    ...(orchestratorResourceId && { 'orchestrator.resource.id': orchestratorResourceId }),
    ...(cloudProvider && { 'cloud.provider': cloudProvider }),
    ...(cloudRegion && { 'cloud.region': cloudRegion }),
    ...(cloudAz && { 'cloud.availability_zone': cloudAz }),
    ...(cloudProjectId && { 'cloud.project.id': cloudProjectId }),
    ...(cloudInstanceId && { 'cloud.instance.id': cloudInstanceId }),
    ...(agentName && { 'agent.name': agentName }),
    ...extraFields,
  };
}
