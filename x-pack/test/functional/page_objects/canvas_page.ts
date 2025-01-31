/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export function CanvasPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const { common } = getPageObjects(['common']);

  return {
    async goToListingPage() {
      log.debug('CanvasPage.goToListingPage');
      // disabling the current url check because canvas moved away from
      // hash router and redirects from /app/canvas#/ to /app/canvas/
      // but navigateToUrl includes hash in the url which causes test flakiness
      await common.navigateToUrl('canvas', '', {
        ensureCurrentUrl: false,
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.existOrFail('workpadListing');
    },

    async enterFullscreen() {
      log.debug('CanvasPage.enterFullscreen');
      const elem = await find.byCssSelector('[aria-label="View fullscreen"]', 20000);
      await elem.click();
    },

    async exitFullscreen() {
      log.debug('CanvasPage.exitFullscreen');
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async openExpressionEditor() {
      log.debug('CanvasPage.openExpressionEditor');
      await testSubjects.click('canvasExpressionEditorButton');
    },

    async waitForWorkpadElements() {
      log.debug('CanvasPage.waitForWorkpadElements');
      await testSubjects.findAll('canvasWorkpadPage > canvasWorkpadPageElementContent');
    },

    /*
     * Finds the first workpad in the loader (uses find, not findAll) and
     * ensures the expected name is the actual name. Then it clicks the element
     * to load the workpad. Resolves once the workpad is in the DOM
     */
    async loadFirstWorkpad(workpadName: string) {
      log.debug('CanvasPage.loadFirstWorkpad', workpadName);
      await testSubjects.setValue('tableListSearchBox', workpadName);
      const elem = await testSubjects.find('canvasWorkpadTableWorkpad');
      const text = await elem.getVisibleText();
      expect(text).to.be(workpadName);
      await elem.click();
      await testSubjects.existOrFail('canvasWorkpadPage');
    },

    async createNewWorkpad() {
      log.debug('CanvasPage.createNewWorkpad');
      await testSubjects.click('create-workpad-button');
    },

    async fillOutCustomElementForm(name: string, description: string) {
      log.debug('CanvasPage.fillOutCustomElementForm', name);
      // Fill out the custom element form and submit it
      await testSubjects.setValue('canvasCustomElementForm-name', name, {
        clearWithKeyboard: true,
      });
      await testSubjects.setValue('canvasCustomElementForm-description', description, {
        clearWithKeyboard: true,
      });

      await testSubjects.click('canvasCustomElementForm-submit');
    },

    async expectCreateWorkpadButtonEnabled() {
      log.debug('CanvasPage.expectCreateWorkpadButtonEnabled');
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateWorkpadButtonDisabled() {
      log.debug('CanvasPage.expectCreateWorkpadButtonDisabled');
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async openAddElementMenu() {
      log.debug('CanvasPage.openAddElementsMenu');
      await testSubjects.click('add-element-button');
    },

    async openAddChartMenu() {
      log.debug('CanvasPage.openAddChartMenu');
      await this.openAddElementMenu();
      await testSubjects.click('canvasAddElementMenu__Chart');
    },

    async createNewDatatableElement() {
      log.debug('CanvasPage.createNewDatatableElement');
      await this.openAddChartMenu();
      await testSubjects.click('canvasAddElementMenu__table');
    },

    async openSavedElementsModal() {
      log.debug('CanvasPage.openSavedElementsModal');
      await testSubjects.click('add-element-button');
      await testSubjects.click('saved-elements-menu-option');

      await common.sleep(1000); // give time for modal animation to complete
    },

    async closeSavedElementsModal() {
      log.debug('CanvasPage.closeSavedElementsModal');
      await testSubjects.click('saved-elements-modal-close-button');
    },

    async expectAddElementButton() {
      log.debug('CanvasPage.expectAddElementButton');
      await testSubjects.existOrFail('add-element-button');
    },

    async expectNoAddElementButton() {
      log.debug('CanvasPage.expectNoAddElementButton');
      // Ensure page is fully loaded first by waiting for the refresh button
      const refreshPopoverExists = await testSubjects.exists('canvas-refresh-control', {
        timeout: 20000,
      });
      expect(refreshPopoverExists).to.be(true);

      await testSubjects.missingOrFail('add-element-button');
    },

    async getFiltersFromDebug(type: 'range' | 'term') {
      log.debug(`CanvasPage.getFiltersFromDebug: ${type}`);
      await testSubjects.existOrFail('canvasDebug__content');

      const contentElem = await testSubjects.find('canvasDebug__content');
      const content = await contentElem.getVisibleText();

      const filters = JSON.parse(content);

      return filters.filters.filter((f: any) => f.query[type]);
    },

    async clickAddFromLibrary() {
      log.debug('CanvasPage.clickAddFromLibrary');
      await testSubjects.click('canvas-add-from-library-button');
      await testSubjects.existOrFail('dashboardAddPanel');
    },

    async setWorkpadName(name: string) {
      log.debug('CanvasPage.setWorkpadName');
      await testSubjects.setValue('canvas-workpad-name-text-field', name);
      const lastBreadcrumb = await testSubjects.getVisibleText('breadcrumb last');
      expect(lastBreadcrumb).to.eql(name);
    },

    async goToListingPageViaBreadcrumbs() {
      log.debug('CanvasPage.goToListingPageViaBreadcrumbs');
      await testSubjects.click('breadcrumb first');
    },

    async addNewPanel(actionName: string) {
      log.debug('CanvasPage.addNewPanel', actionName);
      await testSubjects.click('canvasEditorMenuButton');
      await testSubjects.click(`create-action-${actionName}`);
    },

    async getEmbeddableCount() {
      log.debug('CanvasPage.getEmbeddableCount');
      const panels = await testSubjects.findAll('embeddablePanel');
      return panels.length;
    },

    async deleteSelectedElement() {
      log.debug('CanvasPage.deleteSelectedElement');
      await testSubjects.click('canvasWorkpadEditMenuButton');
      await testSubjects.click('canvasEditMenuDeleteButton');
    },

    async openDatasourceTab() {
      log.debug('CanvasPage.openDataTab');
      await testSubjects.click('canvasSidebarDataTab');
    },

    async changeDatasourceTo(datasourceName: string) {
      log.debug('CanvasPage.changeDatasourceTo');
      await testSubjects.click('canvasChangeDatasourceButton');
      await testSubjects.click(`canvasDatasourceCard__${datasourceName}`);
    },

    async saveDatasourceChanges() {
      log.debug('CanvasPage.saveDatasourceChanges');
      await testSubjects.click('canvasSaveDatasourceButton');
    },

    async goToPreviousPage() {
      log.debug('CanvasPage.goToPreviousPage');
      await testSubjects.click('previousPageButton');
    },

    async goToNextPage() {
      log.debug('CanvasPage.goToNextPage');
      await testSubjects.click('nextPageButton');
    },

    async togglePageManager() {
      log.debug('CanvasPage.openPageManager');
      await testSubjects.click('canvasPageManagerButton');
    },

    async addNewPage() {
      log.debug('CanvasPage.addNewPage');
      if (!(await testSubjects.exists('canvasAddPageButton'))) {
        await this.togglePageManager();
      }
      await testSubjects.click('canvasAddPageButton');
      await this.togglePageManager();
    },
  };
}
