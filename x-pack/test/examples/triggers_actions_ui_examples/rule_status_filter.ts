/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '@kbn/test-suites-src/functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const esArchiver = getService('esArchiver');

  describe('Rule status filter', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await PageObjects.common.navigateToApp('triggersActionsUiExample/rule_status_filter');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('should load from the shareable lazy loader', async () => {
      await testSubjects.find('ruleStatusFilter');
      const exists = await testSubjects.exists('ruleStatusFilter');
      expect(exists).to.be(true);
    });

    it('should allow rule statuses to be filtered', async () => {
      const ruleStatusFilter = await testSubjects.find('ruleStatusFilter');
      let badge = await ruleStatusFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('0');

      await testSubjects.click('ruleStatusFilter');
      await testSubjects.click('ruleStatusFilterOption-enabled');

      badge = await ruleStatusFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('1');

      await testSubjects.click('ruleStatusFilterOption-disabled');

      badge = await ruleStatusFilter.findByCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('2');

      await testSubjects.click('ruleStatusFilterOption-enabled');
      expect(await badge.getVisibleText()).to.be('1');
    });
  });
};
