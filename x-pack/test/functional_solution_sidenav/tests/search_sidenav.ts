/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects(['common', 'solutionNavigation']);
  const spaces = getService('spaces');
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
        const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

        await solutionNavigation.expectExists();
        await solutionNavigation.breadcrumbs.expectExists();

        // check side nav links
        await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'enterpriseSearch',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'enterpriseSearch',
        });

        // check the Content > Indices section
        await solutionNavigation.sidenav.clickLink({
          deepLinkId: 'management:index_management',
        });
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'management:index_management',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Deployment' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Stack Management' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Index Management' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Indices',
        });

        // navigate to a different section
        await solutionNavigation.sidenav.openSection('project_settings_project_nav');
        await solutionNavigation.sidenav.clickLink({ navId: 'stack_management' });
        await solutionNavigation.sidenav.expectLinkActive({ navId: 'stack_management' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Stack Management' });

        // navigate back to the home page using header logo
        await solutionNavigation.clickLogo();
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'enterpriseSearch',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'enterpriseSearch',
        });

        await expectNoPageReload();
      });

      it('renders a feedback callout', async () => {
        await solutionNavigation.sidenav.feedbackCallout.expectExists();
        await solutionNavigation.sidenav.feedbackCallout.dismiss();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
        await browser.refresh();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
      });
    });
  });
}
