/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spacesService = getService('spaces');
  const browser = getService('browser');

  describe('space solution tour', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('solution tour', () => {
      before(async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces', {
          shouldUseHashForSubUrl: false,
        });
      });

      it('does not show the solution tour for the classic space', async () => {
        await testSubjects.missingOrFail('spaceSolutionTour');
      });

      it('does show the solution tour if the default space has a solution set', async () => {
        const defaultSpace = await spacesService.getSpace('default');

        await spacesService.update('default', {
          ...defaultSpace,
          solution: 'es', // set a solution
        });

        await browser.refresh();
        await testSubjects.existOrFail('spaceSolutionTour');

        await testSubjects.click('closeTourBtn'); // close the tour
        await PageObjects.common.sleep(1000); // wait to save the setting

        await browser.refresh();
        await testSubjects.missingOrFail('spaceSolutionTour'); // The tour does not appear after refresh

        await spacesService.update('default', {
          ...defaultSpace,
          solution: 'classic', // revert to not impact future tests
        });
      });
    });
  });
}
