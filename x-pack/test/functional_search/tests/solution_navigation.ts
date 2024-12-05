/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

export default function searchSolutionNavigation({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const { common, solutionNavigation } = getPageObjects(['common', 'solutionNavigation']);
  const spaces = getService('spaces');
  const browser = getService('browser');
  const kibanaServer = getService('kibanaServer');

  // FLAKY: https://github.com/elastic/kibana/issues/201037
  describe.skip('Search Solution Navigation', () => {
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

      // canvas application is only available when installation contains canvas workpads
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/canvas/default'
      );
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/test/functional/fixtures/kbn_archiver/canvas/default'
      );

      // Clean up space created
      await cleanUp();
    });

    it('renders expected side nav items', async () => {
      // Verify all expected top-level links exist
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Overview' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dev Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Indices' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Connectors' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Web Crawlers' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Search applications' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Behavioral Analytics' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference Endpoints' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'App Search' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Workplace Search' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Other tools' });
    });

    it('has expected navigation', async () => {
      const expectNoPageReload = await solutionNavigation.createNoPageReloadCheck();

      // check side nav links
      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearch',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearch',
      });

      // check Dev tools
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'dev_tools',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'dev_tools',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Dev Tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'dev_tools',
      });

      // check Kibana
      // > Discover
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'discover',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'discover',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Kibana' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Discover' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'discover',
      });
      // > Dashboards
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'dashboards',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'dashboards',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Kibana' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Dashboards' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'dashboards',
      });

      // check the Content
      // > Indices section
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchContent:searchIndices',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchContent:searchIndices',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Content' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Indices' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchContent:searchIndices',
      });
      // > Connectors
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchContent:connectors',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchContent:connectors',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Content' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Connectors' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchContent:connectors',
      });
      // > Web Crawlers
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchContent:webCrawlers',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchContent:webCrawlers',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Content' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Web Crawlers' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchContent:webCrawlers',
      });

      // check Build
      // > Playground
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchApplications:playground',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchApplications:playground',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Playground' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchApplications:playground',
      });
      // > Search applications
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchApplications:searchApplications',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchApplications:searchApplications',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Search applications',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchApplications:searchApplications',
      });
      // > Behavioral Analytics
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'enterpriseSearchAnalytics',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'enterpriseSearchAnalytics',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Behavioral Analytics',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'enterpriseSearchAnalytics',
      });

      // check Relevance
      // > Inference Endpoints
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Relevance' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Inference Endpoints',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'searchInferenceEndpoints:inferenceEndpoints',
      });

      // check Enterprise Search
      // > App Search
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'appSearch:engines',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'appSearch:engines',
      });
      // ent-search node not running for FTRs, so we see setup guide without breadcrumbs
      // await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
      //   text: 'App Search',
      // });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'appSearch:engines',
      });
      // > Workplace Search
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'workplaceSearch',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'workplaceSearch',
      });
      // ent-search node not running for FTRs, so we see setup guide without breadcrumbs
      // await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
      //   text: 'Workplace Search',
      // });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'workplaceSearch',
      });

      // Other tools
      await solutionNavigation.sidenav.openSection('search_project_nav.otherTools');
      // > Maps
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'maps',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'maps',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Other tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Maps',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'maps',
      });
      // > Canvas
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'canvas',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'canvas',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Other tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Canvas',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'canvas',
      });
      // > Graph
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'graph',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'graph',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Other tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Graph',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'graph',
      });
      await solutionNavigation.sidenav.closeSection('search_project_nav.otherTools');

      await expectNoPageReload();
    });

    it('renders only expected items', async () => {
      await solutionNavigation.sidenav.openSection('search_project_nav.otherTools');
      await solutionNavigation.sidenav.openSection('project_settings_project_nav');
      await solutionNavigation.sidenav.expectOnlyDefinedLinks([
        'search_project_nav',
        'enterpriseSearch',
        'dev_tools',
        'kibana',
        'discover',
        'dashboards',
        'content',
        'enterpriseSearchContent:searchIndices',
        'enterpriseSearchContent:connectors',
        'enterpriseSearchContent:webCrawlers',
        'build',
        'enterpriseSearchApplications:playground',
        'enterpriseSearchApplications:searchApplications',
        'enterpriseSearchAnalytics',
        'relevance',
        'searchInferenceEndpoints:inferenceEndpoints',
        'entsearch',
        'appSearch:engines',
        'workplaceSearch',
        'otherTools',
        'maps',
        'canvas',
        'graph',
        'project_settings_project_nav',
        'ml:modelManagement',
        'stack_management',
      ]);
    });
  });
}
