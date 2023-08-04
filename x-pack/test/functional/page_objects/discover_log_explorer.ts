/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export function DiscoverLogExplorerPageObject({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');

  return {
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
      return contextMenu.findAllByTagName('button');
    },

    getAllLogDatasetsButton() {
      return testSubjects.find('allLogDatasets');
    },

    getUnmanagedDatasetsButton() {
      return testSubjects.find('unmanagedDatasets');
    },

    async getIntegrations() {
      const content = await this.getDatasetSelectorContent();

      const nodes = await content.findAllByCssSelector('[data-test-subj*="integration-"]');
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
      const content = await this.getDatasetSelectorContent();

      if (await content.isDisplayed()) return button.click();
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

    async assertNoIntegrationsPromptExists() {
      const integrationStatus = await testSubjects.find('integrationStatusItem');
      const promptTitle = await integrationStatus.findByTagName('h2');

      expect(await promptTitle.getVisibleText()).to.be('No integrations found');
    },
  };
}
