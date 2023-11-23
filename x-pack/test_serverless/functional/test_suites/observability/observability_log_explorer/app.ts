/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects([
    'observabilityLogExplorer',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);

  const synthtrace = getService('svlLogsSynthtraceClient');
  const dataGrid = getService('dataGrid');
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const kibanaServer = getService('kibanaServer');

  describe('Application', () => {
    before(async () => {
      await PageObjects.svlCommonPage.login();
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
    });

    it('is shown in the global search', async () => {
      await PageObjects.observabilityLogExplorer.navigateTo();

      await PageObjects.svlCommonNavigation.search.showSearch();
      await PageObjects.svlCommonNavigation.search.searchFor('log explorer');

      const results = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
      expect(results[0].label).to.eql('Logs Explorer');

      await PageObjects.svlCommonNavigation.search.hideSearch();
    });

    it('should support navigating between Discover tabs', async () => {
      await kibanaServer.savedObjects.create({
        type: 'index-pattern',
        id: 'metrics-*',
        overwrite: true,
        attributes: {
          title: 'metrics-*',
        },
      });
      await PageObjects.svlCommonNavigation.sidenav.clickLink({ deepLinkId: 'discover' });
      await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'discover',
      });
      expect(await browser.getCurrentUrl()).contain('/app/discover');
      await testSubjects.click('logExplorerTab');
      await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'observability-log-explorer',
      });
      expect(await browser.getCurrentUrl()).contain('/app/observability-log-explorer');
      await testSubjects.click('discoverTab');
      await PageObjects.svlCommonNavigation.breadcrumbs.expectBreadcrumbExists({
        deepLinkId: 'discover',
      });
      expect(await browser.getCurrentUrl()).contain('/app/discover');
      await kibanaServer.savedObjects.delete({
        type: 'index-pattern',
        id: 'metrics-*',
      });
    });

    it('should load logs', async () => {
      const from = '2023-08-03T10:24:14.035Z';
      const to = '2023-08-03T10:24:14.091Z';
      const COUNT = 5;
      await synthtrace.index(generateLogsData({ from, to, count: COUNT }));
      await PageObjects.observabilityLogExplorer.navigateTo();
      const docCount = await dataGrid.getDocCount();

      expect(docCount).to.be(COUNT);
      await synthtrace.clean();
    });
  });
}

function generateLogsData({ from, to, count = 1 }: { from: string; to: string; count: number }) {
  const range = timerange(from, to);

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) =>
      Array(count)
        .fill(0)
        .map(() => {
          return log.create().message('A sample log').timestamp(timestamp);
        })
    );
}
