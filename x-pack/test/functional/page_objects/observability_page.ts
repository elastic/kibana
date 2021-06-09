/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export function ObservabilityPageProvider({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);

  return {
    async enterFullscreen() {
      const elem = await find.byCssSelector('[aria-label="View fullscreen"]', 20000);
      await elem.click();
    },

    async exitFullscreen() {
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async openExpressionEditor() {
      await testSubjects.click('observabilityExpressionEditorButton');
    },

    async waitForWorkpadElements() {
      await testSubjects.findAll(
        'observabilityWorkpadPage > observabilityWorkpadPageElementContent'
      );
    },

    /*
     * Finds the first workpad in the loader (uses find, not findAll) and
     * ensures the expected name is the actual name. Then it clicks the element
     * to load the workpad. Resolves once the workpad is in the DOM
     */
    async loadFirstWorkpad(workpadName: string) {
      const elem = await testSubjects.find('observabilityWorkpadLoaderWorkpad');
      const text = await elem.getVisibleText();
      expect(text).to.be(workpadName);
      await elem.click();
      await testSubjects.existOrFail('observabilityWorkpadPage');
    },

    async fillOutCustomElementForm(name: string, description: string) {
      // Fill out the custom element form and submit it
      await testSubjects.setValue('observabilityCustomElementForm-name', name, {
        clearWithKeyboard: true,
      });
      await testSubjects.setValue('observabilityCustomElementForm-description', description, {
        clearWithKeyboard: true,
      });

      await testSubjects.click('observabilityCustomElementForm-submit');
    },

    async expectCreateCaseButtonEnabled() {
      const button = await testSubjects.find('createNewCaseBtn', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateCaseButtonDisabled() {
      const button = await testSubjects.find('createNewCaseBtn', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async openSavedElementsModal() {
      await testSubjects.click('add-element-button');
      await testSubjects.click('saved-elements-menu-option');

      await PageObjects.common.sleep(1000); // give time for modal animation to complete
    },
    async closeSavedElementsModal() {
      await testSubjects.click('saved-elements-modal-close-button');
    },

    async expectCreateCase() {
      await testSubjects.existOrFail('case-creation-form-steps');
    },

    async expectNoAddElementButton() {
      // Ensure page is fully loaded first by waiting for the refresh button
      const refreshPopoverExists = await testSubjects.exists('observability-refresh-control', {
        timeout: 20000,
      });
      expect(refreshPopoverExists).to.be(true);

      await testSubjects.missingOrFail('add-element-button');
    },

    async getTimeFiltersFromDebug() {
      await testSubjects.existOrFail('observabilityDebug__content');

      const contentElem = await testSubjects.find('observabilityDebug__content');
      const content = await contentElem.getVisibleText();

      const filters = JSON.parse(content);

      return filters.and.filter((f: any) => f.filterType === 'time');
    },

    async getMatchFiltersFromDebug() {
      await testSubjects.existOrFail('observabilityDebug__content');

      const contentElem = await testSubjects.find('observabilityDebug__content');
      const content = await contentElem.getVisibleText();

      const filters = JSON.parse(content);

      return filters.and.filter((f: any) => f.filterType === 'exactly');
    },
  };
}
