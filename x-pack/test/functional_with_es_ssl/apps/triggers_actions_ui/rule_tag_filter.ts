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
  const find = getService('find');
  const PageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const esArchiver = getService('esArchiver');

  describe('Rule tag filter', () => {
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

    it('shoud load from shareable lazy loader', async () => {
      await testSubjects.find('ruleTagFilter');
      const exists = await testSubjects.exists('ruleTagFilter');
      expect(exists).to.be(true);
    });

    it('should allow tag filters to be selected', async () => {
      let badge = await find.byCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('0');

      await testSubjects.click('ruleTagFilter');
      await testSubjects.click('ruleTagFilterOption-tag1');

      badge = await find.byCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('1');

      await testSubjects.click('ruleTagFilterOption-tag2');

      badge = await find.byCssSelector('.euiFilterButton__notification');
      expect(await badge.getVisibleText()).to.be('2');

      await testSubjects.click('ruleTagFilterOption-tag1');
      expect(await badge.getVisibleText()).to.be('1');
    });
  });
};
