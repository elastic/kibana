/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects(['common', 'solutionNavigation']);
  const spaces = getService('spaces');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');

  describe('search solution', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the search solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({ solution: 'es' }));
      await browser.navigateTo(spaces.getRootUrl(spaceCreated.id));
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    describe('sidenav & breadcrumbs', () => {
      it('renders the correct nav and navigate to links', async () => {
        await solutionNavigation.expectExists();
        await solutionNavigation.breadcrumbs.expectExists();
        // Navigate to the home page to account for the getting started page redirect
        await common.navigateToApp('elasticsearch/home', { basePath: `/s/${spaceCreated.id}` });
        // check side nav links
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'searchHomepage',
        });

        await solutionNavigation.sidenav.clickLink({
          deepLinkId: 'discover',
        });
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'discover',
        });

        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Discover' });

        // navigate to a different section
        await solutionNavigation.sidenav.clickLink({
          deepLinkId: 'agent_builder',
        });
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'agent_builder',
        });
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'agent_builder',
        });
        await solutionNavigation.sidenav.clickLink({ navId: 'stack_management' });
        await solutionNavigation.sidenav.expectLinkActive({ navId: 'stack_management' });

        // navigate back to the home page using header logo
        await solutionNavigation.clickLogo();
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'searchHomepage',
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
