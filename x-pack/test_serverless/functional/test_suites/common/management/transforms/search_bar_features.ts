/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['header', 'svlCommonPage', 'svlCommonNavigation']);

  const allLabels = [{ search: 'transform', label: 'Data / Transforms', expected: true }];
  const expectedLabels = allLabels.filter((l) => l.expected);
  const notExpectedLabels = allLabels.filter((l) => !l.expected);

  describe('Search bar features', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    describe('list features', () => {
      if (expectedLabels.length > 0) {
        it('has the correct features enabled', async () => {
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.svlCommonNavigation.search.showSearch();

          for (const expectedLabel of expectedLabels) {
            await PageObjects.svlCommonNavigation.search.searchFor(expectedLabel.search);
            const [result] = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
            const label = result?.label;
            expect(label).to.eql(
              expectedLabel.label,
              `First result should be ${expectedLabel.label} (got matching items '${label}')`
            );
          }

          await PageObjects.svlCommonNavigation.search.hideSearch();
        });
      }

      if (notExpectedLabels.length > 0) {
        it('has the correct features disabled', async () => {
          await PageObjects.header.waitUntilLoadingHasFinished();
          await PageObjects.svlCommonNavigation.search.showSearch();

          for (const notExpectedLabel of notExpectedLabels) {
            await PageObjects.svlCommonNavigation.search.searchFor(notExpectedLabel.search);
            const [result] = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
            const label = result?.label;
            expect(label).to.not.eql(
              notExpectedLabel.label,
              `First result should not be ${notExpectedLabel.label} (got matching items '${label}')`
            );
          }

          await PageObjects.svlCommonNavigation.search.hideSearch();
        });
      }
    });
  });
}
