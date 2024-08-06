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
    'observabilityLogsExplorer',
    'svlCommonNavigation',
    'svlCommonPage',
  ]);

  const synthtrace = getService('svlLogsSynthtraceClient');
  const dataGrid = getService('dataGrid');

  describe('Application', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    it('is shown in the global search', async () => {
      await PageObjects.observabilityLogsExplorer.navigateTo();

      await PageObjects.svlCommonNavigation.search.showSearch();
      await PageObjects.svlCommonNavigation.search.searchFor('logs explorer');

      const results = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
      expect(results[0].label).to.eql('Logs Explorer');

      await PageObjects.svlCommonNavigation.search.hideSearch();
    });

    it('should load logs', async () => {
      const from = '2023-08-03T10:24:14.035Z';
      const to = '2023-08-03T10:24:14.091Z';
      const COUNT = 5;
      await synthtrace.index(generateLogsData({ from, to, count: COUNT }));
      await PageObjects.observabilityLogsExplorer.navigateTo();
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
