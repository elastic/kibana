/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../ftr_provider_context';

export function CanvasPageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async enterFullscreen() {
      const elem = await find.byCssSelector('[aria-label="View fullscreen"]', 20000);
      await elem.click();
    },

    async exitFullscreen() {
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async openExpressionEditor() {
      await testSubjects.click('canvasExpressionEditorButton');
    },

    async waitForWorkpadElements() {
      await testSubjects.findAll('canvasWorkpadPage > canvasWorkpadPageElementContent');
    },

    async fillOutCustomElementForm(name: string, description: string) {
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
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be(null);
    },

    async expectCreateWorkpadButtonDisabled() {
      const button = await testSubjects.find('create-workpad-button', 20000);
      const disabledAttr = await button.getAttribute('disabled');
      expect(disabledAttr).to.be('true');
    },

    async openSavedElementsModal() {
      await testSubjects.click('add-element-button');
      await testSubjects.click('saved-elements-menu-option');
    },
    async closeSavedElementsModal() {
      await testSubjects.click('saved-elements-modal-close-button');
    },

    async expectAddElementButton() {
      await testSubjects.existOrFail('add-element-button');
    },

    async expectNoAddElementButton() {
      // Ensure page is fully loaded first by waiting for the refresh button
      const refreshPopoverExists = await testSubjects.exists('canvas-refresh-control', {
        timeout: 20000,
      });
      expect(refreshPopoverExists).to.be(true);

      await testSubjects.missingOrFail('add-element-button');
    },
  };
}
