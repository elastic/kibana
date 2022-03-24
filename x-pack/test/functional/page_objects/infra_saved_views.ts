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
    async getSavedViewsButton() {
      return await testSubjects.find('savedViews-openPopover');
    },

    async clickSavedViewsButton() {
      return await testSubjects.click('savedViews-openPopover');
    },

    async getSavedViewsPopoer() {
      return await testSubjects.find('savedViews-popover');
    },

    async closeSavedViewsPopover() {
      await testSubjects.find('savedViews-popover');
      return await browser.pressKeys([Key.ESCAPE]);
    },

    async getLoadViewButton() {
      return await testSubjects.find('savedViews-loadView');
    },

    async clickLoadViewButton() {
      return await testSubjects.click('savedViews-loadView');
    },

    async getManageViewsButton() {
      return await testSubjects.find('savedViews-manageViews');
    },

    async clickManageViewsButton() {
      return await testSubjects.click('savedViews-manageViews');
    },

    async getUpdateViewButton() {
      return await testSubjects.find('savedViews-updateView');
    },

    async clickUpdateViewButton() {
      return await testSubjects.click('savedViews-updateView');
    },

    async getSaveNewViewButton() {
      return await testSubjects.find('savedViews-saveNewView');
    },

    async clickSaveNewViewButton() {
      return await testSubjects.click('savedViews-saveNewView');
    },

    async getCreateSavedViewModal() {
      return await testSubjects.find('savedViews-createModal');
    },

    async createNewSavedView(name: string) {
      await testSubjects.setValue('savedViewViweName', name);
      await testSubjects.click('createSavedViewButton');
      await testSubjects.missingOrFail('savedViews-createModal');
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

    async closeSavedViewsLoadModal() {
      return await testSubjects.click('cancelSavedViewModal');
    },
  };
}
