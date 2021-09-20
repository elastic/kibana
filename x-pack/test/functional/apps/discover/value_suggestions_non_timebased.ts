/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'settings', 'context']);

  describe('value suggestions non time based', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
    });

    after(async () => {
      await esArchiver.unload(
        'test/functional/fixtures/es_archiver/index_pattern_without_timefield'
      );
    });

    it('shows all autosuggest options for a filter in discover context app', async () => {
      await PageObjects.common.navigateToApp('discover');

      await queryBar.setQuery('type.keyword : ');
      const suggestions = await queryBar.getSuggestions();
      expect(suggestions.length).to.be(1);
      expect(suggestions).to.contain('"apache"');
    });
  });
}
