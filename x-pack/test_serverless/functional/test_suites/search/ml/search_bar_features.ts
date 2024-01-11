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
    { label: 'Machine Learning', expected: true },
    { label: 'Machine Learning / Overview', expected: false },
    { label: 'Machine Learning / Anomaly Detection', expected: false },
    { label: 'Machine Learning / Anomaly Detection / Anomaly explorer', expected: false },
    { label: 'Machine Learning / Anomaly Detection / Single metric viewer', expected: false },
    { label: 'Machine Learning / Data Frame Analytics', expected: false },
    { label: 'Machine Learning / Data Frame Analytics / Results explorer', expected: false },
    { label: 'Machine Learning / Data Frame Analytics / Analytics map', expected: false },
    { label: 'Machine Learning / Model Management', expected: true },
    { label: 'Machine Learning / Model Management / Trained Models', expected: true },
    { label: 'Machine Learning / Model Management / Nodes', expected: false },
    { label: 'Machine Learning / Memory Usage', expected: true },
    { label: 'Machine Learning / Settings', expected: false },
    { label: 'Machine Learning / Settings / Calendars', expected: false },
    { label: 'Machine Learning / Settings / Filter Lists', expected: false },
    { label: 'Machine Learning / AIOps', expected: true },
    { label: 'Machine Learning / AIOps / Log Rate Analysis', expected: true },
    { label: 'Machine Learning / AIOps / Log Pattern Analysis', expected: true },
    { label: 'Machine Learning / AIOps / Change Point Detection', expected: true },
    { label: 'Machine Learning / Notifications', expected: true },
    { label: 'Machine Learning / Data Visualizer', expected: true },
    { label: 'Machine Learning / File Upload', expected: true },
    { label: 'Machine Learning / Index Data Visualizer', expected: true },
    { label: 'Machine Learning / Data Drift', expected: true },
    { label: 'Alerts and Insights / Machine Learning', expected: true },
  ];

  describe('Search bar features', () => {
    before(async () => {
      await PageObjects.svlCommonPage.login();
    });

    after(async () => {
      await PageObjects.svlCommonPage.forceLogout();
    });

    describe('list features', () => {
      it('has the correct features enabled', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.svlCommonNavigation.search.showSearch();

        const expectedLabels = allLabels.filter((l) => l.expected).map((l) => l.label);

        for (const expectedLabel of expectedLabels) {
          await PageObjects.svlCommonNavigation.search.searchFor(expectedLabel);
          const [result] = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
          const label = result?.label;
          expect(label).to.eql(
            expectedLabel,
            `First result should be ${expectedLabel} (got matching items '${label}')`
          );
        }
        await PageObjects.svlCommonNavigation.search.hideSearch();
      });

      it('has the correct features disabled', async () => {
        await PageObjects.header.waitUntilLoadingHasFinished();
        await PageObjects.svlCommonNavigation.search.showSearch();

        const notExpectedLabels = allLabels.filter((l) => !l.expected).map((l) => l.label);

        for (const notExpectedLabel of notExpectedLabels) {
          await PageObjects.svlCommonNavigation.search.searchFor(notExpectedLabel);
          const [result] = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
          const label = result?.label;
          expect(label).to.not.eql(
            notExpectedLabel,
            `First result should not be ${notExpectedLabel} (got matching items '${label}')`
          );
        }
        await PageObjects.svlCommonNavigation.search.hideSearch();
      });
    });
  });
}
