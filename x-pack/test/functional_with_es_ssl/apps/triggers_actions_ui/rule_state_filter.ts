/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const esArchiver = getService('esArchiver');

  describe('Rule state filter', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await PageObjects.common.navigateToUrlWithBrowserHistory(
        'triggersActions',
        '/__components_sandbox'
      );
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('should load from the shareable lazy loader', async () => {
      await testSubjects.find('ruleStateFilter');
      const exists = await testSubjects.exists('ruleStateFilter');
      expect(exists).to.be(true);
    });

    it('should allow rule states to be filtered', async () => {
      const ruleStateFilter = await testSubjects.find('ruleStateFilter');
      let badge = await ruleStateFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('0');

      await testSubjects.click('ruleStateFilter');
      await testSubjects.click('ruleStateFilterOption-enabled');

      badge = await ruleStateFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('1');

      await testSubjects.click('ruleStateFilterOption-disabled');

      badge = await ruleStateFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('2');

      await testSubjects.click('ruleStateFilterOption-enabled');
      expect(await badge.getVisibleText()).to.be('1');
    });
  });
};
