/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

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

        // open apm (Application) panel using the link button (not the button icon)
        await solutionNavigation.sidenav.openPanel('apm', { button: 'link' });
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('apm');
          expect(isOpen).to.be(true);
        }

        // TODO: here navigate to some link inside the panel (note: this is a smoke test file not full coverage)

        await solutionNavigation.sidenav.closePanel('apm', { button: 'link' });
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('apm');
          expect(isOpen).to.be(false);
        }

        // check the AI Assistant
        await solutionNavigation.sidenav.clickLink({ navId: 'observabilityAIAssistant' }); // click on AI Assistant link
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'AI Assistant' });

        // navigate to a different section
        await solutionNavigation.sidenav.openSection('project_settings_project_nav');
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'management' });
        await solutionNavigation.sidenav.expectLinkActive({ deepLinkId: 'management' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'management' });
        // -----------------------------------------------------------------------------------------

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
    });
  });
}
