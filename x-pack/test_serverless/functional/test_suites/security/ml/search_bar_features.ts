/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header', 'svlCommonPage', 'svlCommonNavigation']);

  const allLabels = [
    { label: 'Machine Learning', expected: true },
    { label: 'Machine Learning / Overview', expected: true },
    { label: 'Machine Learning / Anomaly Detection Jobs', expected: true },
    { label: 'Machine Learning / Anomaly Detection / Anomaly explorer', expected: true },
    { label: 'Machine Learning / Anomaly Detection / Single metric viewer', expected: true },
    { label: 'Machine Learning / Data Frame Analytics Jobs', expected: true },
    { label: 'Machine Learning / Data Frame Analytics / Results explorer', expected: true },
    { label: 'Machine Learning / Data Frame Analytics / Analytics map', expected: true },
    { label: 'Machine Learning / Trained Models', expected: true },
    { label: 'Machine Learning / Memory Usage', expected: true },
    { label: 'Machine Learning / Anomaly Detection Settings', expected: true },
    { label: 'Machine Learning / AIOps', expected: true },
    { label: 'Machine Learning / AIOps / Log Rate Analysis', expected: true },
    { label: 'Machine Learning / AIOps / Log Pattern Analysis', expected: true },
    { label: 'Machine Learning / AIOps / Change Point Detection', expected: true },
    { label: 'Machine Learning / Notifications', expected: true },
    { label: 'Machine Learning / Data Visualizer', expected: true },
    { label: 'Machine Learning / File Upload', expected: true },
    { label: 'Machine Learning / Index Data Visualizer', expected: true },
    { label: 'Machine Learning / ES|QL Data Visualizer', expected: true },
    { label: 'Machine Learning / Data Drift', expected: true },
  ];

  describe('Search bar features', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole('platform_engineer');
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
