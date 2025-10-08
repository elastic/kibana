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
  const browser = getService('browser');

  // Failing: See https://github.com/elastic/kibana/issues/237708
  // Failing: See https://github.com/elastic/kibana/issues/237035
  describe.skip('security solution', () => {
    let cleanUp: () => Promise<unknown>;
    let spaceCreated: { id: string } = { id: '' };

    before(async () => {
      // Navigate to the spaces management page which will log us in Kibana
      await common.navigateToUrl('management', 'kibana/spaces', {
        shouldUseHashForSubUrl: false,
      });

      // Create a space with the security solution and navigate to its home page
      ({ cleanUp, space: spaceCreated } = await spaces.create({ solution: 'security' }));
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
        await solutionNavigation.sidenav.expectSectionExists('security_solution_nav');
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'securitySolutionUI:get_started',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'securitySolutionUI:get_started',
        });

        // check the Investigations subsection
        await solutionNavigation.sidenav.expandMore();
        // open Investigations popover and navigate to some link inside the popover to open the panel
        await solutionNavigation.sidenav.clickLink({ navId: 'securityGroup:investigations' });
        await solutionNavigation.sidenav.clickLink({ navId: 'timelines' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Timelines' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'securitySolutionUI:timelines',
        });

        // navigate back to the home page using header logo
        await solutionNavigation.clickLogo();
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'securitySolutionUI:get_started',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'securitySolutionUI:get_started',
        });

        await expectNoPageReload();
      });

      it('renders a feedback callout', async () => {
        await solutionNavigation.sidenav.feedbackCallout.reset();
        await solutionNavigation.sidenav.feedbackCallout.expectExists();
        await solutionNavigation.sidenav.feedbackCallout.dismiss();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
        await browser.refresh();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
      });

      it('renders tour', async () => {
        await solutionNavigation.sidenav.tour.reset();
        await solutionNavigation.sidenav.tour.expectTourStepVisible('sidenav-home');
        await solutionNavigation.sidenav.tour.nextStep();
        await solutionNavigation.sidenav.tour.expectTourStepVisible('sidenav-more');
        await solutionNavigation.sidenav.tour.nextStep();
        await solutionNavigation.sidenav.tour.expectTourStepVisible('sidenav-manage-data');
        await solutionNavigation.sidenav.tour.nextStep();
        await solutionNavigation.sidenav.tour.expectHidden();
        await browser.refresh();
        await solutionNavigation.sidenav.tour.expectHidden();
      });
    });
  });
}
