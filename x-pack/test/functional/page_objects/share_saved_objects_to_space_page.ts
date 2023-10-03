/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export function ShareSavedObjectsToSpacePageProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const { savedObjects, common } = getPageObjects(['savedObjects', 'common']);

  return {
    async openShareToSpaceFlyoutForObject(objectName: string) {
      // This searchForObject narrows down the objects to those matching ANY of the words in the objectName.
      // Hopefully the one we want is on the first page of results.
      await savedObjects.searchForObject(objectName);
      await common.sleep(1000);
      await savedObjects.clickShareToSpaceByTitle(objectName);
      await testSubjects.existOrFail('share-to-space-flyout');
    },

    async setupForm({ destinationSpaceId }: { destinationSpaceId: string }) {
      await testSubjects.click(`sts-space-selector-row-${destinationSpaceId}`);
    },

    async saveShare() {
      await testSubjects.click('sts-save-button');
    },
  };
}
