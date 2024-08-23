/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const ADD_TO_CASE_DATA_TEST_SUBJ = 'embeddablePanelAction-embeddable_addToExistingCase';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const svlObltNavigation = getService('svlObltNavigation');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const find = getService('find');
  const toasts = getService('toasts');
  const retry = getService('retry');
  const dashboardPanelActions = getService('dashboardPanelActions');

  describe('Cases persistable attachments', function () {
    describe('lens visualization', () => {
      before(async () => {
        await svlCommonPage.loginWithPrivilegedRole();
        await kibanaServer.savedObjects.cleanStandardList();
        await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.load(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await svlObltNavigation.navigateToLandingPage();
        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });

        await dashboard.clickNewDashboard();
        await lens.createAndAddLensFromDashboard({});
        await dashboard.waitForRenderComplete();
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();

        await esArchiver.unload('x-pack/test/functional/es_archives/logstash_functional');
        await kibanaServer.importExport.unload(
          'x-pack/test/functional/fixtures/kbn_archiver/lens/lens_basic.json'
        );

        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('adds lens visualization to a new case', async () => {
        const caseTitle = 'case created in observability from my dashboard with lens visualization';

        await dashboardPanelActions.clickContextMenuItem(ADD_TO_CASE_DATA_TEST_SUBJ);

        await retry.waitFor('wait for the modal to open', async () => {
          return (
            (await testSubjects.exists('all-cases-modal')) &&
            (await testSubjects.exists('cases-table-add-case-filter-bar'))
          );
        });

        await retry.waitFor('wait for the flyout to open', async () => {
          if (await testSubjects.exists('cases-table-add-case-filter-bar')) {
            await testSubjects.click('cases-table-add-case-filter-bar');
          }

          return testSubjects.exists('create-case-flyout');
        });

        await testSubjects.setValue('input', caseTitle);
        await testSubjects.setValue('euiMarkdownEditorTextArea', 'test description');

        // verify that solution picker is not visible
        await testSubjects.missingOrFail('caseOwnerSelector');
        await testSubjects.click('create-case-submit');

        await cases.common.expectToasterToContain(`${caseTitle} has been updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }

        const title = await find.byCssSelector('[data-test-subj="editable-title-header-value"]');
        expect(await title.getVisibleText()).toEqual(caseTitle);

        await retry.waitFor('wait for the visualization to exist', async () => {
          return testSubjects.exists('comment-persistableState-.lens');
        });
      });

      it('adds lens visualization to an existing case from dashboard', async () => {
        const theCaseTitle = 'case already exists in observability!!';
        const theCase = await cases.api.createCase({
          title: theCaseTitle,
          description: 'This is a test case to verify existing action scenario!!',
          owner: 'observability',
        });

        await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'dashboards' });

        await dashboardPanelActions.clickContextMenuItem(ADD_TO_CASE_DATA_TEST_SUBJ);
        // verify that solution filter is not visible
        await testSubjects.missingOrFail('options-filter-popover-button-owner');

        await testSubjects.click(`cases-table-row-select-${theCase.id}`);

        await cases.common.expectToasterToContain(`${theCaseTitle} has been updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

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
