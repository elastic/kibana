/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const queryBar = getService('queryBar');
  const PageObjects = getPageObjects(['common', 'timePicker']);

  describe('value suggestions', function describeIndexTests() {
    before(async function () {
      await esArchiver.loadIfNeeded('logstash_functional');
      await esArchiver.load('dashboard/drilldowns');
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.timePicker.setDefaultAbsoluteRange();
    });

    after(async () => {
      await esArchiver.unload('dashboard/drilldowns');
    });

    it('show up', async () => {
      await queryBar.setQuery('extension.raw : ');
      const suggestions = await queryBar.getSuggestions();
      expect(suggestions.length).to.be(5);
      expect(suggestions).to.contain('"jpg"');
    });
  });
}
