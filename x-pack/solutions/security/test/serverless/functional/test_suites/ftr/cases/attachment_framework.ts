/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const ADD_TO_CASE_DATA_TEST_SUBJ = 'embeddablePanelAction-embeddable_addToExistingCase';

export default ({ getPageObject, getService }: FtrProviderContext) => {
  const common = getPageObject('common');
  const dashboard = getPageObject('dashboard');
  const lens = getPageObject('lens');
  const svlCommonPage = getPageObject('svlCommonPage');
  const testSubjects = getService('testSubjects');
  const cases = getService('cases');
  const svlCases = getService('svlCases');
  const retry = getService('retry');
  const header = getPageObject('header');
  const toasts = getService('toasts');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const listingTable = getService('listingTable');
  const browser = getService('browser');

  describe('Cases persistable attachments', () => {
    describe('lens visualization', () => {
      const dashboardName = `Security cases dashboard ${uuidv4()}`;
      let dashboardId: string | undefined;

      before(async () => {
        await svlCommonPage.loginAsAdmin();
        await esArchiver.loadIfNeeded(
          'x-pack/platform/test/fixtures/es_archives/logstash_functional'
        );
        await kibanaServer.importExport.load(
          'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
        );
        // `createAndAddLensFromDashboard` configures logstash fields (bytes / @timestamp / ip)
        // on the default data view, which the managed Case Analytics data view can otherwise take.
        await kibanaServer.uiSettings.update({ defaultIndex: 'logstash-*' });

        await common.navigateToApp('security', { path: 'dashboards' });
        await header.waitUntilLoadingHasFinished();

        await retry.waitFor('createDashboardButton', async () => {
          return await testSubjects.exists('createDashboardButton');
        });

        await testSubjects.click('createDashboardButton');
        await header.waitUntilLoadingHasFinished();

        await lens.createAndAddLensFromDashboard({});
        await dashboard.waitForRenderComplete();
        await dashboard.saveDashboard(dashboardName, {
          saveAsNew: true,
          waitDialogIsClosed: true,
          exitFromEditMode: false,
        });

        await retry.waitFor('saved dashboard id in the url', async () => {
          const { pathname } = new URL(await browser.getCurrentUrl());
          const id = pathname.split('/dashboards/')[1]?.split('/')[0];
          dashboardId = id && id !== 'create' ? id : undefined;
          return dashboardId !== undefined;
        });
      });

      after(async () => {
        await svlCases.api.deleteAllCaseItems();

        if (dashboardId) {
          await kibanaServer.savedObjects.delete({ type: 'dashboard', id: dashboardId });
        }
        await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/logstash_functional');
        await kibanaServer.importExport.unload(
          'x-pack/platform/test/functional/fixtures/kbn_archives/lens/lens_basic.json'
        );
        await kibanaServer.uiSettings.unset('defaultIndex');
      });

      it('adds lens visualization to a new case', async () => {
        const caseTitle =
          'case created in security solution from my dashboard with lens visualization';

        await dashboardPanelActions.clickPanelAction(ADD_TO_CASE_DATA_TEST_SUBJ);

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

        await cases.common.expectToasterToContain(`Case ${caseTitle} updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }

        const title = await testSubjects.find('appHeaderTitle');
        expect(await title.getVisibleText()).toContain(caseTitle);

        await retry.waitFor('wait for the visualization to exist', async () => {
          return testSubjects.exists('comment-lens-lens');
        });
      });

      it('adds lens visualization to an existing case from dashboard', async () => {
        const theCaseTitle = 'case already exists in security solution!!';
        const theCase = await cases.api.createCase({
          title: theCaseTitle,
          description: 'This is a test case to verify existing action scenario!!',
          owner: 'securitySolution',
        });

        await common.navigateToApp('security', { path: 'dashboards' });
        await header.waitUntilLoadingHasFinished();
        await listingTable.searchForItemWithName(dashboardName, { escape: false });
        await listingTable.clickItemLink('dashboard', dashboardName);
        await dashboard.waitForRenderComplete();

        await dashboardPanelActions.clickPanelAction(ADD_TO_CASE_DATA_TEST_SUBJ);

        // verify that solution filter is not visible
        await testSubjects.missingOrFail('options-filter-popover-button-owner');

        await testSubjects.click(`cases-table-row-select-${theCase.id}`);

        await cases.common.expectToasterToContain(`Case ${theCaseTitle} updated`);
        await testSubjects.click('toaster-content-case-view-link');
        await toasts.dismissAllWithChecks();

        if (await testSubjects.exists('appLeaveConfirmModal')) {
          await testSubjects.exists('confirmModalConfirmButton');
          await testSubjects.click('confirmModalConfirmButton');
        }

        const title = await testSubjects.find('appHeaderTitle');
        expect(await title.getVisibleText()).toContain(theCaseTitle);

        await testSubjects.existOrFail('comment-lens-lens');
      });
    });
  });
};
