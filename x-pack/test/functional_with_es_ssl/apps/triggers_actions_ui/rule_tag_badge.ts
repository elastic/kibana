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

  // Failing: See https://github.com/elastic/kibana/issues/132739
  describe.skip('Rule tag badge', () => {
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
      await testSubjects.find('ruleTagBadge');
      const exists = await testSubjects.exists('ruleTagBadge');
      expect(exists).to.be(true);
    });

    it('should open and display tags', async () => {
      await testSubjects.click('ruleTagBadge');
      expect(await testSubjects.exists('ruleTagBadgeItem-tag1')).to.be(true);
      expect(await testSubjects.exists('ruleTagBadgeItem-tag2')).to.be(true);
      expect(await testSubjects.exists('ruleTagBadgeItem-tag3')).to.be(true);
      expect(await testSubjects.exists('ruleTagBadgeItem-tag4')).to.be(true);
    });
  });
};
