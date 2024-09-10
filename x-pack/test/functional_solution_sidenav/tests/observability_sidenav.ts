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

        // check the AI & ML subsection
        await solutionNavigation.sidenav.openSection('observability_project_nav.aiMl'); // open AI & ML subsection
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'ml:anomalyDetection' });
        await solutionNavigation.sidenav.expectLinkActive({ deepLinkId: 'ml:anomalyDetection' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Anomaly Detection' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          deepLinkId: 'ml:anomalyDetection',
        });

        // navigate to a different section
        await solutionNavigation.sidenav.openSection('project_settings_project_nav');
        await solutionNavigation.sidenav.clickLink({ deepLinkId: 'management' });
        await solutionNavigation.sidenav.expectLinkActive({ deepLinkId: 'management' });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ deepLinkId: 'management' });

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
