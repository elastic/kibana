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
  const PageObjects = getPageObjects(['common', 'timePicker']);

  describe('value suggestions', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/logstash_functional');
      await esArchiver.load('x-pack/test/functional/es_archives/dashboard/drilldowns');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/dashboard/drilldowns');
    });

    it('show up', async () => {
      await queryBar.setQuery('extension.raw : ');
      const suggestions = await queryBar.getSuggestions();
      expect(suggestions.length).to.be(5);
      expect(suggestions).to.contain('"jpg"');
    });
  });
}
