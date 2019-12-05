/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

function extractCountFromSummary(str: string) {
  return parseInt(str.split('\n')[1], 10);
}

export function CopySavedObjectsToSpacePageProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const find = getService('find');

  return {
    async searchForObject(objectName: string) {
      const searchBox = await testSubjects.find('savedObjectSearchBar');
      await searchBox.clearValue();
      await searchBox.type(objectName);
      await searchBox.pressKeys(browser.keys.ENTER);
    },

    async openCopyToSpaceFlyoutForObject(objectName: string) {
      await this.searchForObject(objectName);

      // Click action button to show context menu
      await find.clickByCssSelector(
        'table.euiTable tbody tr.euiTableRow td.euiTableRowCell:last-child .euiButtonIcon'
      );

      // Wait for context menu to render
      await find.existsByCssSelector('.euiContextMenuPanel');

      const actions = await find.allByCssSelector('.euiContextMenuItem');

      for (const action of actions) {
        const actionText = await action.getVisibleText();
        if (actionText === 'Copy to space') {
          await action.click();
          break;
        }
      }

      await testSubjects.existOrFail('copy-to-space-flyout');
    },

    async setupForm({
      overwrite,
      destinationSpaceId,
    }: {
      overwrite?: boolean;
      destinationSpaceId: string;
    }) {
      if (!overwrite) {
        await testSubjects.click('cts-form-overwrite');
      }
      await testSubjects.click(`cts-space-selector-row-${destinationSpaceId}`);
    },

    async startCopy() {
      await testSubjects.click('cts-initiate-button');
    },

    async finishCopy() {
      await testSubjects.click('cts-finish-button');
      await testSubjects.waitForDeleted('copy-to-space-flyout');
    },

    async getSummaryCounts(includeOverwrite: boolean = false) {
      const copied = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-success-count')
      );
      const skipped = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-conflict-count')
      );
      const errors = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-error-count')
      );

      let overwrite;
      if (includeOverwrite) {
        overwrite = extractCountFromSummary(
          await testSubjects.getVisibleText('cts-summary-overwrite-count')
        );
      } else {
        await testSubjects.missingOrFail('cts-summary-overwrite-count', { timeout: 250 });
      }

      return {
        copied,
        skipped,
        errors,
        overwrite,
      };
    },
  };
}
