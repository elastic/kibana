/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Key } from 'selenium-webdriver';
import type { FtrProviderContext } from '../ftr_provider_context';

export function InfraSavedViewsProvider({ getService }: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const config = getService('config');

  return {
    async clickSavedViewsButton() {
      const button = await testSubjects.find('savedViews-openPopover-loaded');

      await retry.waitFor('Wait for button to be enabled', async () => {
        const isDisabled = Boolean(await button.getAttribute('disabled'));
        return !isDisabled;
      });

      return button.click();
    },
    async pressEsc() {
      return browser.pressKeys([Key.ESCAPE]);
    },

    async closeSavedViewsPopover() {
      await retry.tryForTime(config.get('timeouts.try'), async () => {
        await this.pressEsc();
        await testSubjects.missingOrFail('loadViewsFlyout');
      });
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
      await testSubjects.setValue('savedViewName', name, { clearWithKeyboard: true });
      await testSubjects.click('createSavedViewButton');
      await testSubjects.missingOrFail('createSavedViewButton', { timeout: 20000 });
      await retry.tryForTime(config.get('timeouts.try'), async () => {
        await testSubjects.missingOrFail('savedViews-upsertModal');
      });
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
      await retry.tryForTime(config.get('timeouts.try'), async () => {
        const subject = await testSubjects.find('savedViews-openPopover-loaded');
        expect(await subject.getVisibleText()).to.be(name);
      });
    },
  };
}
