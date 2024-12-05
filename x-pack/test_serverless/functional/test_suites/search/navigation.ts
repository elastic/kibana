/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const svlSearchLandingPage = getPageObject('svlSearchLandingPage');
  const svlSearchNavigation = getService('svlSearchNavigation');
  const svlCommonNavigation = getPageObject('svlCommonNavigation');
  const svlCommonPage = getPageObject('svlCommonPage');
  const solutionNavigation = getPageObject('solutionNavigation');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const header = getPageObject('header');

  describe('navigation', function () {
    // see details: https://github.com/elastic/kibana/issues/196823
    this.tags(['failsOnMKI']);
    before(async () => {
      await svlCommonPage.loginWithRole('developer');
      await svlSearchNavigation.navigateToLandingPage();
    });
    it('navigate search sidenav & breadcrumbs', async () => {
      const expectNoPageReload = await svlCommonNavigation.createNoPageReloadCheck();

      // check serverless search side nav exists
      await svlCommonNavigation.expectExists();
      await svlCommonNavigation.breadcrumbs.expectExists();
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      // check side nav links
      await solutionNavigation.sidenav.expectSectionExists('search_project_nav');
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Indices' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Create your first index',
      });
      await testSubjects.existOrFail(`elasticsearchStartPage`);

      // check Data
      // > Index Management
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'management:index_management',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Data' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Index Management' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Indices' });

      // > Connectors
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'serverlessConnectors',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'serverlessConnectors',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Data' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Connectors' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'serverlessConnectors',
      });
      // check Build
      // > Dev Tools
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'dev_tools',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'dev_tools',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Dev Tools' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'dev_tools',
      });
      // > Playground
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'searchPlayground',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchPlayground',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Build' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Playground' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'searchPlayground',
      });
      // check Relevance
      // > Inference Endpoints
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'searchInferenceEndpoints',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'searchInferenceEndpoints',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Relevance' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Inference Endpoints' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'searchInferenceEndpoints',
      });

      // check Analyze
      // > Discover
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'discover',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'discover',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Analyze' });
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
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Analyze' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Dashboards' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'dashboards',
      });

      // check Getting Started
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'serverlessElasticsearch',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'serverlessElasticsearch',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Getting Started' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        text: 'Getting Started',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'serverlessElasticsearch',
      });

      // Open Project Settings
      await solutionNavigation.sidenav.openSection('project_settings_project_nav');
      // check Project Settings
      // > Trained Models
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'ml:modelManagement',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'ml:modelManagement',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Model Management' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Trained Models' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'ml:modelManagement',
      });
      // > Management
      await solutionNavigation.sidenav.clickLink({
        deepLinkId: 'management',
      });
      await solutionNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management',
      });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({ text: 'Management' });
      await solutionNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'management',
      });

      // navigate back to serverless search overview
      await svlCommonNavigation.clickLogo();
      await svlCommonNavigation.sidenav.expectLinkActive({
        deepLinkId: 'management:index_management',
      });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({ text: `Indices` });
      await testSubjects.existOrFail(`elasticsearchStartPage`);

      await expectNoPageReload();
    });

    it('navigate to playground from side nav', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'searchPlayground' });
      await header.waitUntilLoadingHasFinished();
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Build', 'Playground']);

      await svlCommonNavigation.sidenav.expectLinkActive({ deepLinkId: 'searchPlayground' });
      expect(await browser.getCurrentUrl()).contain('/app/search_playground/chat');
    });

    it("management apps from the sidenav hide the 'stack management' root from the breadcrumbs", async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management:index_management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts([
        'Data',
        'Index Management',
        'Indices',
      ]);
    });

    it('navigate management', async () => {
      await svlCommonNavigation.sidenav.openSection('project_settings_project_nav');
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'management' });
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management']);
      await testSubjects.click('app-card-dataViews');
      await svlCommonNavigation.breadcrumbs.expectBreadcrumbTexts(['Management', 'Data views']);
    });

    it('navigate using search', async () => {
      await svlCommonNavigation.search.showSearch();
      // TODO: test something search project specific instead of generic discover
      await svlCommonNavigation.search.searchFor('discover');
      await svlCommonNavigation.search.clickOnOption(0);
      await svlCommonNavigation.search.hideSearch();

      expect(await browser.getCurrentUrl()).contain('/app/discover');
    });

    it('does not show cases in sidebar navigation', async () => {
      await svlSearchLandingPage.assertSvlSearchSideNavExists();

      expect(await testSubjects.missingOrFail('cases'));
    });

    it('does not navigate to cases app', async () => {
      await svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });

      expect(await browser.getCurrentUrl()).not.contain('/app/management/cases');
      await testSubjects.missingOrFail('cases-all-title');
    });

    it('renders expected side navigation items', async () => {
      await solutionNavigation.sidenav.openSection('project_settings_project_nav');
      // Verify all expected top-level links exist
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Data' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Index Management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Connectors' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Web Crawlers' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Build' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dev Tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Playground' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Relevance' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Inference Endpoints' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Analyze' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Discover' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Dashboards' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Other tools' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Maps' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Getting Started' });

      await solutionNavigation.sidenav.expectLinkExists({ text: 'Trained models' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Management' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Users and roles' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Performance' });
      await solutionNavigation.sidenav.expectLinkExists({ text: 'Billing and subscription' });

      await solutionNavigation.sidenav.openSection('project_settings_project_nav');
      await solutionNavigation.sidenav.expectOnlyDefinedLinks([
        'search_project_nav',
        'data',
        'management:index_management',
        'serverlessConnectors',
        'serverlessWebCrawlers',
        'build',
        'dev_tools',
        'searchPlayground',
        'relevance',
        'searchInferenceEndpoints',
        'analyze',
        'discover',
        'dashboards',
        'otherTools',
        'maps',
        'gettingStarted',
        'project_settings_project_nav',
        'ml:modelManagement',
        'management',
        'cloudLinkUserAndRoles',
        'cloudLinkDeployment',
        'cloudLinkBilling',
      ]);
    });
  });
}
