/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const spaces = getService('spaces');
  const PageObjects = getPageObjects(['settings', 'common', 'dashboard', 'timePicker', 'header']);

  describe('landing page', function describeIndexTests() {
    let cleanUp: () => Promise<unknown> = () => Promise.resolve();
    let spaceCreated: { id: string } = { id: '' };

    it('should render the "classic" prompt', async function () {
      await PageObjects.common.navigateToApp('management');
      await testSubjects.existOrFail('managementHome', { timeout: 3000 });
    });

    describe('solution empty prompt', () => {
      const createSpaceWithSolutionAndNavigateToManagement = async (solution: SolutionView) => {
        ({ cleanUp, space: spaceCreated } = await spaces.create({ solution }));

        await PageObjects.common.navigateToApp('management', { basePath: `/s/${spaceCreated.id}` });

        return async () => {
          await cleanUp();
          cleanUp = () => Promise.resolve();
        };
      };

      afterEach(async function afterEach() {
        await cleanUp();
      });

      /** Test that the empty prompt has a button to open the stack managment panel */
      const testStackManagmentPanel = async () => {
        await testSubjects.missingOrFail('~sideNavPanel-id-stack_management', { timeout: 1000 });
        await testSubjects.click('~viewAllStackMngtPagesButton'); // open the side nav
        await testSubjects.existOrFail('~sideNavPanel-id-stack_management', { timeout: 3000 });
      };

      const testCorrectEmptyPrompt = async () => {
        await testSubjects.missingOrFail('managementHome', { timeout: 3000 });
        await testSubjects.existOrFail('managementHomeSolution', { timeout: 3000 });
      };

      it('should render the "solution" prompt when the space has a solution set', async function () {
        {
          const deleteSpace = await createSpaceWithSolutionAndNavigateToManagement('es');
          await testCorrectEmptyPrompt();
          await testStackManagmentPanel();
          await deleteSpace();
        }

        {
          const deleteSpace = await createSpaceWithSolutionAndNavigateToManagement('oblt');
          await testCorrectEmptyPrompt();
          await testStackManagmentPanel();
          await deleteSpace();
        }

        {
          const deleteSpace = await createSpaceWithSolutionAndNavigateToManagement('security');
          await testCorrectEmptyPrompt();
          await testStackManagmentPanel();
          await deleteSpace();
        }
      });

      it('should have links to pages in management', async function () {
        await createSpaceWithSolutionAndNavigateToManagement('es');

        await testSubjects.click('~managementLinkToIndices', 3000);
        await testSubjects.existOrFail('~indexManagementHeaderContent', { timeout: 3000 });
        await browser.goBack();
        await testSubjects.existOrFail('managementHomeSolution', { timeout: 3000 });

        await testSubjects.click('~managementLinkToDataViews', 3000);
        await testSubjects.existOrFail('~indexPatternTable', { timeout: 3000 });
        await browser.goBack();
        await testSubjects.existOrFail('managementHomeSolution', { timeout: 3000 });

        await testSubjects.click('~managementLinkToIngestPipelines', 3000);
        const appTitle = await testSubjects.getVisibleText('appTitle');
        expect(appTitle).to.be('Ingest Pipelines');
        // Note: for some reason, browser.goBack() does not work from Ingest Pipelines
        // so using navigateToApp instead;
        await PageObjects.common.navigateToApp('management', { basePath: `/s/${spaceCreated.id}` });
        await testSubjects.existOrFail('managementHomeSolution', { timeout: 3000 });

        await testSubjects.click('~managementLinkToUsers', 3000);
        await testSubjects.existOrFail('~securityUsersPageHeader', { timeout: 3000 });
      });
    });
  });
}
