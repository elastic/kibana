/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { log, timerange } from '@kbn/apm-synthtrace-client';
import { FtrProviderContext } from './config';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'navigationalSearch', 'observabilityLogsExplorer']);
  const testSubjects = getService('testSubjects');
  const synthtrace = getService('logSynthtraceEsClient');
  const dataGrid = getService('dataGrid');

  describe('Application', () => {
    it('is shown in the global search', async () => {
      await PageObjects.common.navigateToApp('home');
      await PageObjects.navigationalSearch.searchFor('logs explorer');

      const results = await PageObjects.navigationalSearch.getDisplayedResults();
      expect(results[0].label).to.eql('Logs Explorer');
    });

    it('is shown in the observability side navigation', async () => {
      await PageObjects.observabilityLogsExplorer.navigateTo();
      await testSubjects.existOrFail('observability-nav-observability-logs-explorer-explorer');
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
