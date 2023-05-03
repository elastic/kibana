/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import { FtrProviderContext } from '../ftr_provider_context';

export function InfraSavedViewsProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  return {
    getSavedViewsButton() {
      return testSubjects.find('savedViews-openPopover');
    },

    clickSavedViewsButton() {
      return testSubjects.click('savedViews-openPopover');
    },

    getSavedViewsPopover() {
      return testSubjects.find('savedViews-popover');
    },

    pressEsc() {
      return browser.pressKeys([Key.ESCAPE]);
    },

    async closeSavedViewsPopover() {
      await testSubjects.find('savedViews-popover');
      return this.pressEsc();
    },

    getLoadViewButton() {
      return testSubjects.find('savedViews-loadView');
    },

    getManageViewsButton() {
      return testSubjects.find('savedViews-manageViews');
    },

    clickManageViewsButton() {
      return testSubjects.click('savedViews-manageViews');
    },

    getManageViewsFlyout() {
      return testSubjects.find('loadViewsFlyout');
    },

    async getManageViewsEntries() {
      await this.clickSavedViewsButton();
      await this.clickManageViewsButton();
      return testSubjects.findAll('infraRenderNameButton');
    },

    getUpdateViewButton() {
      return testSubjects.find('savedViews-updateView');
    },

    clickUpdateViewButton() {
      return testSubjects.click('savedViews-updateView');
    },

    getSaveNewViewButton() {
      return testSubjects.find('savedViews-saveNewView');
    },

    clickSaveNewViewButton() {
      return testSubjects.click('savedViews-saveNewView');
    },

    getCreateSavedViewModal() {
      return testSubjects.find('savedViews-upsertModal');
    },

    async createNewSavedView(name: string) {
      await testSubjects.setValue('savedViewName', name);
      await testSubjects.click('createSavedViewButton');
      await testSubjects.missingOrFail('savedViews-upsertModal');
    },

    async createView(name: string) {
      await this.clickSavedViewsButton();
      await this.clickSaveNewViewButton();
      await this.createNewSavedView(name);
    },

    async updateView(name: string) {
      await this.clickSavedViewsButton();
      await this.clickUpdateViewButton();
      await this.createNewSavedView(name);
    },

    async ensureViewIsLoaded(name: string) {
      await retry.try(async () => {
        const subject = await testSubjects.find('savedViews-openPopover');
        expect(await subject.getVisibleText()).to.be(name);
      });
    },

    async ensureViewIsLoadable(name: string) {
      const subject = await testSubjects.find('savedViews-loadList');
      await subject.findByCssSelector(`li[title="${name}"]`);
    },

    closeSavedViewsLoadModal() {
      return testSubjects.click('cancelSavedViewModal');
    },
  };
}
