/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const svlSecNavigation = getService('svlSecNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const find = getService('find');

  describe('Cases persistable attachments', () => {
    describe('lens visualization', () => {
      before(async () => {
        await svlCommonPage.login();
        await svlSecNavigation.navigateToLandingPage();

        await testSubjects.click('solutionSideNavItemLink-dashboards');
        await testSubjects.click('createDashboardButton');

        await lens.createAndAddLensFromDashboard({});
        await dashboard.waitForRenderComplete();
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();
        await svlCommonPage.forceLogout();
      });

      it('adds lens visualization to a new case', async () => {
        const caseTitle =
          'case created in security solution from my dashboard with lens visualization';

        await testSubjects.click('embeddablePanelToggleMenuIcon');
        await testSubjects.click('embeddablePanelMore-mainMenu');
        await testSubjects.click('embeddablePanelAction-embeddable_addToNewCase');

        await testSubjects.existOrFail('create-case-flyout');

        await testSubjects.setValue('input', caseTitle);

        await testSubjects.setValue('euiMarkdownEditorTextArea', 'test description');

        // verify that solution picker is not visible
        await testSubjects.missingOrFail('caseOwnerSelector');

        await testSubjects.click('create-case-submit');

        await cases.common.expectToasterToContain(`${caseTitle} has been updated`);

        await testSubjects.click('toaster-content-case-view-link');

        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }

        const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
        expect(await title.getVisibleText()).toEqual(caseTitle);

        await testSubjects.existOrFail('comment-persistableState-.lens');
      });

      it('adds lens visualization to an existing case from dashboard', async () => {
        const theCaseTitle = 'case already exists in security solution!!';
        const theCase = await cases.api.createCase({
          title: theCaseTitle,
          description: 'This is a test case to verify existing action scenario!!',
          owner: 'securitySolution',
        });

        await testSubjects.click('solutionSideNavItemLink-dashboards');

        if (await testSubjects.exists('edit-unsaved-New-Dashboard')) {
          await testSubjects.click('edit-unsaved-New-Dashboard');
        }

        await testSubjects.click('embeddablePanelToggleMenuIcon');
        await testSubjects.click('embeddablePanelMore-mainMenu');
        await testSubjects.click('embeddablePanelAction-embeddable_addToExistingCase');

        // verify that solution filter is not visible
        await testSubjects.missingOrFail('solution-filter-popover-button');

        await testSubjects.click(`cases-table-row-select-${theCase.id}`);

        await cases.common.expectToasterToContain(`${theCaseTitle} has been updated`);
        await testSubjects.click('toaster-content-case-view-link');

        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }

        const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
        expect(await title.getVisibleText()).toEqual(theCaseTitle);

        await testSubjects.existOrFail('comment-persistableState-.lens');
      });
    });
  });
};
