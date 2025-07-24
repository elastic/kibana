/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation, header } = getPageObjects([
    'common',
    'solutionNavigation',
    'header',
  ]);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');

  describe('o11y sidenav', () => {
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
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      // Clean up space created
      await cleanUp();
    });

    describe('sidenav & breadcrumbs', () => {
      it('renders the correct nav and navigate to links', async () => {
        await solutionNavigation.sidenav.clickLink({ navId: 'observabilityAIAssistant' }); // click on AI Assistant link
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'AI Assistant' });

        // check Other Tools section
        await solutionNavigation.sidenav.openPanel('otherTools');
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('otherTools');
          expect(isOpen).to.be(true);
        }
        await solutionNavigation.sidenav.expectLinkExists({
          panelNavLinkId: 'logs:anomalies',
        });

        await solutionNavigation.sidenav.expectLinkExists({
          panelNavLinkId: 'logs:log-categories',
        });

        await solutionNavigation.sidenav.clickPanelLink('visualize');
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Visualize library',
        });

        // check Machine Learning section
        await solutionNavigation.sidenav.openPanel('machine_learning-landing');
        {
          const isOpen = await solutionNavigation.sidenav.isPanelOpen('machine_learning-landing');
          expect(isOpen).to.be(true);
        }

        await solutionNavigation.sidenav.expectLinkExists({
          panelNavLinkId: 'ml:anomalyExplorer',
        });
        await solutionNavigation.sidenav.expectLinkExists({
          panelNavLinkId: 'ml:singleMetricViewer',
        });

        // Supplied configurations is under Management -> Anomaly Detection Jobs -> Click button mlSuppliedConfigurationsButton
        await solutionNavigation.sidenav.openSection(
          'observability_project_nav_footer.project_settings_project_nav'
        );
        await solutionNavigation.sidenav.clickLink({ navId: 'stack_management' });
        await solutionNavigation.sidenav.expectLinkActive({ navId: 'stack_management' });
        await solutionNavigation.sidenav.clickPanelLink('management:anomaly_detection');
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
          text: 'Anomaly Detection Jobs',
        });
        await testSubjects.click('mlSuppliedConfigurationsButton');
        await testSubjects.existOrFail('mlPageSuppliedConfigurations');
      });
    });
  });
}
