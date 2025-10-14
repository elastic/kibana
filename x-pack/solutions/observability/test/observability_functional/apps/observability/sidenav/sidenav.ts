/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, solutionNavigation, header } = getPageObjects([
    'common',
    'solutionNavigation',
    'header',
  ]);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

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
        await solutionNavigation.sidenav.expandMore();
        await retry.waitFor('redirect or status response', async () => {
          await solutionNavigation.sidenav.clickLink({ navId: 'aiAssistantContainer' }); // click on AI Assistant link
          return (await browser.getCurrentUrl()).includes('/app/observabilityAIAssistant');
        });
        await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'AI Assistant' });

        // Open other tools more popover
        await solutionNavigation.sidenav.expandMore();
        await solutionNavigation.sidenav.clickLink({ navId: 'otherTools' });
        // open first other tools link in a popover to open the panel
        await solutionNavigation.sidenav.clickLink({ navId: 'logs:anomalies' });
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

        // Open machine learning popover
        await solutionNavigation.sidenav.expandMore();
        await solutionNavigation.sidenav.clickLink({ navId: 'machine_learning-landing' });
        // click on Machine Learning link
        await solutionNavigation.sidenav.clickLink({ navId: 'ml:overview' });
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
