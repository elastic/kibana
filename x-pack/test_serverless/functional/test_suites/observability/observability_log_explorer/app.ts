/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['observabilityLogExplorer', 'svlCommonNavigation']);

  describe('Application', () => {
    it('is shown in the global search', async () => {
      await PageObjects.observabilityLogExplorer.navigateTo();
      await PageObjects.svlCommonNavigation.search.showSearch();
      await PageObjects.svlCommonNavigation.search.searchFor('log explorer');

      const results = await PageObjects.svlCommonNavigation.search.getDisplayedResults();
      expect(results[0].label).to.eql('Log Explorer');

      await PageObjects.svlCommonNavigation.search.hideSearch();
    });
  });
}
