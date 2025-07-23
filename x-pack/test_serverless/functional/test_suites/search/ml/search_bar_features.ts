/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header', 'svlCommonPage', 'svlCommonNavigation']);

  const allLabels = [
    { label: 'Machine learning', expected: true },
    { label: 'Machine learning / Overview', expected: true },
    { label: 'Machine learning / Anomaly Detection', expected: false },
    { label: 'Machine learning / Anomaly Detection / Anomaly explorer', expected: false },
    { label: 'Machine learning / Anomaly Detection / Single metric viewer', expected: false },
    { label: 'Machine learning / Notifications', expected: true },
    { label: 'Machine learning / Memory Usage', expected: true },
    { label: 'Machine learning / Data Frame Analytics', expected: false },
    { label: 'Machine learning / Data Frame Analytics / Results explorer', expected: false },
    { label: 'Machine learning / Data Frame Analytics / Analytics map', expected: false },
    { label: 'Machine learning / Trained Models', expected: true },
    { label: 'Machine learning / Model Management / Nodes', expected: false },
    { label: 'Machine learning / Settings', expected: false },
    { label: 'Machine learning / Settings / Calendars', expected: false },
    { label: 'Machine learning / Settings / Filter Lists', expected: false },
    { label: 'Machine learning / AIOps', expected: true },
    { label: 'Machine learning / AIOps / Log Rate Analysis', expected: true },
    { label: 'Machine learning / AIOps / Log Pattern Analysis', expected: true },
    { label: 'Machine learning / AIOps / Change Point Detection', expected: true },
    { label: 'Machine learning / Data Visualizer', expected: true },
    { label: 'Machine learning / File Upload', expected: true },
    { label: 'Machine learning / Index Data Visualizer', expected: true },
    { label: 'Machine learning / ES|QL Data Visualizer', expected: true },
    { label: 'Machine learning / Data Drift', expected: true },
  ];

  describe('Search bar features', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('developer');
    });

    describe('list features', () => {
      it('has the correct features enabled', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.svlCommonNavigation.search.showSearch();

        const expectedLabels = allLabels.filter((l) => l.expected).map((l) => l.label);

        for (const expectedLabel of expectedLabels) {
          await PageObjects.svlCommonNavigation.search.searchFor(expectedLabel);
          const results = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
          expect(results.length).to.be.greaterThan(0);
          expect(results.map((r) => r.label)).to.contain(expectedLabel);
        }
        await PageObjects.svlCommonNavigation.search.hideSearch();
      });

      it('has the correct features disabled', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.svlCommonNavigation.search.showSearch();

        const notExpectedLabels = allLabels.filter((l) => !l.expected).map((l) => l.label);

        for (const notExpectedLabel of notExpectedLabels) {
          await PageObjects.svlCommonNavigation.search.searchFor(notExpectedLabel);
          const results = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
          expect(results.map((r) => r.label)).to.not.contain(notExpectedLabel);
        }
        await PageObjects.svlCommonNavigation.search.hideSearch();
      });
    });
  });
}
