/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects(['common', 'solutionNavigation']);
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('observability solution', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the observability solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({ solution: 'oblt' }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    describe('sidenav & breadcrumbs', () => {
      it('renders the correct nav and navigate to links', async () => {
        const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

        await solutionNavigation.expectExists();
        await solutionNavigation.breadcrumbs.expectExists();

        // check side nav links
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observabilityOnboarding',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'observabilityOnboarding',
        });

        // open application panel
        await solutionNavigation.sidenav.openPanel('applications');
        expect(await solutionNavigation.sidenav.isPanelOpen('applications')).to.be(true);

        // open Infrastructure popover and navigate to some link inside the panel
        // Note: clickLink now automatically expands More menu if needed
        await solutionNavigation.sidenav.clickLink({ navId: 'metrics' });

        // open first link in popover to open a panel
        await solutionNavigation.sidenav.clickLink({ navId: 'metrics:inventory' });
        expect(await solutionNavigation.sidenav.isPanelOpen('metrics')).to.be(true);

        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Infrastructure inventory',
        });

        await solutionNavigation.sidenav.clickPanelLink('metrics:hosts');

        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Hosts',
        });
        expect(await solutionNavigation.sidenav.isPanelOpen('metrics')).to.be(true);

        await solutionNavigation.sidenav.clickLink({ navId: 'stack_management' });
        await solutionNavigation.sidenav.expectLinkActive({ navId: 'stack_management' });

        await solutionNavigation.sidenav.clickPanelLink('management:tags');
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Stack Management' });

        // navigate back to the home page using header logo
        await solutionNavigation.clickLogo();

        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observabilityOnboarding',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'observabilityOnboarding',
        });

        await expectNoPageReload();
      });

      it('shows cases in sidebar navigation', async () => {
        await solutionNavigation.expectExists();

        await solutionNavigation.sidenav.expectLinkExists({
          deepLinkId: 'observability-overview:cases',
        });
      });

      it('navigates to cases app', async () => {
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });

        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observability-overview:cases',
        });
        expect(await browser.getCurrentUrl()).contain('/app/observability/cases');

        await testSubjects.click('createNewCaseBtn');
        expect(await browser.getCurrentUrl()).contain('app/observability/cases/create');
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observability-overview:cases',
        });

        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'observability-overview:cases' });

        await testSubjects.click('configure-case-button');
        expect(await browser.getCurrentUrl()).contain('app/observability/cases/configure');
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observability-overview:cases',
        });
      });

      it('opens panel on legacy management landing page', async () => {
        await common.navigateToApp('management', { basePath: `/s/${spaceCreated.id}` });
        await testSubjects.existOrFail('managementHomeSolution');
        await solutionNavigation.sidenav.expectPanelExists('stack_management');
      });
    });
  });
}
