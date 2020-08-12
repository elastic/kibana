/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { keyBy } from 'lodash';
import { FtrProviderContext } from '../ftr_provider_context';

function extractCountFromSummary(str: string) {
  return parseInt(str.split('\n')[1], 10);
}

export function CopySavedObjectsToSpacePageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const { savedObjects, common } = getPageObjects(['savedObjects', 'common']);

  return {
    async openCopyToSpaceFlyoutForObject(objectName: string) {
      // This searchForObject narrows down the objects to those matching ANY of the words in the objectName.
      // Hopefully the one we want is on the first page of results.
      await savedObjects.searchForObject(objectName);
      await common.sleep(1000);

      // this gets all the elements in the saved object table and keys them by title
      const elements = keyBy(await savedObjects.getElementsInTable(), 'title');
      // If there are more than 2 "actions" on the saved object we get the ... menu
      // if there is the ... action menu we need to click it and click the copy saved object element
      if (elements[objectName].menuElement) {
        await elements[objectName].menuElement?.click();
        // Wait for context menu to render
        await find.existsByCssSelector('.euiContextMenuPanel');
        await testSubjects.click('savedObjectsTableAction-copy_saved_objects_to_space');
      } else {
        // or there might be the copy saved object element without the menu
        await elements[objectName].copySaveObjectsElement?.click();
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
