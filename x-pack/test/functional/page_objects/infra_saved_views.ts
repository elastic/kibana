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
    clickSavedViewsButton() {
      return testSubjects.click('savedViews-openPopover');
    },
    pressEsc() {
      return browser.pressKeys([Key.ESCAPE]);
    },

    async closeSavedViewsPopover() {
      await testSubjects.find('savedViews-popover');
      return this.pressEsc();
    },

    clickManageViewsButton() {
      return testSubjects.click('savedViews-manageViews');
    },

    async getManageViewsEntries() {
      await this.clickManageViewsButton();
      return testSubjects.findAll('infraRenderNameButton');
    },

    clickUpdateViewButton() {
      return testSubjects.click('savedViews-updateView');
    },

    clickSaveNewViewButton() {
      return testSubjects.click('savedViews-saveNewView');
    },

    async createNewSavedView(name: string) {
      await testSubjects.setValue('savedViewName', name);
      await testSubjects.click('createSavedViewButton');
      await testSubjects.missingOrFail('savedViews-upsertModal');
    },

    async createView(name: string) {
      await this.clickSaveNewViewButton();
      await this.createNewSavedView(name);
    },

    async updateView(name: string) {
      await this.clickUpdateViewButton();
      await this.createNewSavedView(name);
    },

    async ensureViewIsLoaded(name: string) {
      await retry.try(async () => {
        const subject = await testSubjects.find('savedViews-openPopover');
        expect(await subject.getVisibleText()).to.be(name);
      });
    },
  };
}
