/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../ftr_provider_context';

function extractCountFromSummary(str: string) {
  return parseInt(str.split('\n')[1], 10);
}

export function CopySavedObjectsToSpacePageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const { savedObjects, common } = getPageObjects(['savedObjects', 'common']);

  return {
    async openCopyToSpaceFlyoutForObject(objectName: string) {
      // This searchForObject narrows down the objects to those matching ANY of the words in the objectName.
      // Hopefully the one we want is on the first page of results.
      await savedObjects.searchForObject(objectName);
      await common.sleep(1000);
      await savedObjects.clickCopyToSpaceByTitle(objectName);
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
        const radio = await testSubjects.find('cts-copyModeControl-overwriteRadioGroup');
        // a radio button consists of a div tag that contains an input, a div, and a label
        // we can't click the input directly, need to go up one level and click the parent div
        const div = await radio.findByXpath("//div[input[@id='overwriteDisabled']]");
        await div.click();
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

    async getSummaryCounts() {
      const success = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-success-count')
      );
      const pending = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-pending-count')
      );
      const skipped = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-skipped-count')
      );
      const errors = extractCountFromSummary(
        await testSubjects.getVisibleText('cts-summary-error-count')
      );

      return {
        success,
        pending,
        skipped,
        errors,
      };
    },
  };
}
