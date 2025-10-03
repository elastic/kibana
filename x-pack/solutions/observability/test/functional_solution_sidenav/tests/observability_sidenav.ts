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
        await solutionNavigation.sidenav.expectSectionExists('observability_project_nav');
        await solutionNavigation.sidenav.expectLinkActive({
          deepLinkId: 'observabilityOnboarding',
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'observabilityOnboarding',
        });

        // open application panel
        await solutionNavigation.sidenav.openPanel('applications');
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('applications');
          expect(isOpen).to.be(true);
        }

        // open Infrastructure popover and navigate to some link inside the panel
        await solutionNavigation.sidenav.expandMore();
        await solutionNavigation.sidenav.clickLink({ navId: 'metrics' });
        // open first link in popover to open a panel
        await solutionNavigation.sidenav.clickLink({ navId: 'metrics:inventory' });
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('metrics');
          expect(isOpen).to.be(true);
        }
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Infrastructure inventory',
        });
        await solutionNavigation.sidenav.clickPanelLink('metrics:hosts');
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Hosts',
        });

        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('metrics');
          expect(isOpen).to.be(true);
        }

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

      it('renders a feedback callout', async () => {
        await solutionNavigation.sidenav.feedbackCallout.reset();
        await solutionNavigation.sidenav.openPanel('applications');
        await solutionNavigation.sidenav.feedbackCallout.expectExists();
        await solutionNavigation.sidenav.feedbackCallout.dismiss();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
        await browser.refresh();
        await solutionNavigation.sidenav.feedbackCallout.expectMissing();
      });
    });
  });
}
