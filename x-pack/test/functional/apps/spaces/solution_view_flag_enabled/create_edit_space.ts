/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects(['common', 'settings', 'security', 'spaceSelector']);
  const testSubjects = getService('testSubjects');
  const spacesService = getService('spaces');
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

        await testSubjects.existOrFail('spaces-view-page');
        await testSubjects.existOrFail('spaces-view-page > generalPanel');
        await testSubjects.existOrFail('spaces-view-page > navigationPanel');
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

        await testSubjects.missingOrFail('space-edit-page-user-impact-warning');
        await PageObjects.spaceSelector.changeSolutionView('classic');
        await testSubjects.existOrFail('space-edit-page-user-impact-warning'); // Warn that the change will impact other users

        await PageObjects.spaceSelector.clickSaveSpaceCreation();
        await PageObjects.spaceSelector.confirmModal();

        await testSubjects.existOrFail('mgtSideBarNav');
        await testSubjects.missingOrFail('searchSideNav');
      });
    });

    describe('API-created Space', () => {
      before(async () => {
        await spacesService.create({
          id: 'foo-space',
          name: 'Foo Space',
          disabledFeatures: [],
          color: '#AABBCC',
        });
      });

      after(async () => {
        await spacesService.delete('foo-space');
      });

      it('enabled features can be changed while the solution view remains unselected', async () => {
        const securityFeatureCheckboxId = 'featureCategoryCheckbox_securitySolution';

        await PageObjects.common.navigateToUrl('management', 'kibana/spaces/edit/foo-space', {
          shouldUseHashForSubUrl: false,
        });

        await testSubjects.existOrFail('spaces-view-page');

        // ensure security feature is selected by default
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(true);

        // Do not set a solution view first!

        await PageObjects.spaceSelector.toggleFeatureCategoryCheckbox('securitySolution');
        //
        // ensure security feature now unselected
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(false);

        await testSubjects.existOrFail('space-edit-page-user-impact-warning');

        await PageObjects.spaceSelector.clickSaveSpaceCreation();

        await testSubjects.click('confirmModalConfirmButton');

        await testSubjects.existOrFail('spaces-view-page');

        await testSubjects.click('foo-space-hyperlink');

        await testSubjects.existOrFail('spaces-view-page');

        // ensure security feature is still unselected
        expect(await testSubjects.isChecked(securityFeatureCheckboxId)).to.be(false);
      });
    });
  });
}
