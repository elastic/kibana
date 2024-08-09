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
  const find = getService('find');

  describe('edit space', () => {
    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    describe('solution view', () => {
      it('does show the solution view panel', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-edit-page');
        await testSubjects.existOrFail('spaces-edit-page > generalPanel');
        await testSubjects.existOrFail('spaces-edit-page > navigationPanel');
      });

      it('changes the space solution and updates the side navigation', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        // Make sure we are on the classic side nav
        await testSubjects.existOrFail('mgtSideBarNav');
        await testSubjects.missingOrFail('searchSideNav');

        // change to Enterprise Search
        await PageObjects.spaceSelector.changeSolutionView('es');
        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await PageObjects.spaceSelector.confirmModal();

        await find.waitForDeletedByCssSelector('.kibanaWelcomeLogo');

        // Search side nav is loaded
        await testSubjects.existOrFail('searchSideNav');
        await testSubjects.missingOrFail('mgtSideBarNav');

        // change back to classic
        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/default', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.missingOrFail('userImpactWarning');
        await PageObjects.spaceSelector.changeSolutionView('classic');
        await testSubjects.existOrFail('userImpactWarning'); // Warn that the change will impact other users

        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await PageObjects.spaceSelector.confirmModal();

        await testSubjects.existOrFail('mgtSideBarNav');
        await testSubjects.missingOrFail('searchSideNav');
      });
    });
  });
}
