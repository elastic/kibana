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
  // const retry = getService('retry');
  const esArchiver = getService('esArchiver');
  // const find = getService('find');

  describe('Rule status dropdown', function () {
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
      await testSubjects.find('statusDropdown');
      const exists = await testSubjects.exists('statusDropdown');
      expect(exists).to.be(true);
    });

    it('should store the previous snooze interval', async () => {
      await testSubjects.find('statusDropdown');
      await testSubjects.click('statusDropdown');
      await testSubjects.click('statusDropdownSnoozeItem');
      await testSubjects.setValue('ruleSnoozeIntervalValue', '10');
      await testSubjects.setValue('ruleSnoozeIntervalUnit', 'h');
      await testSubjects.click('ruleSnoozeApply');

      // Wait for the dropdown to finish re-rendering before opening again
      await new Promise((res) => setTimeout(res, 500));

      await testSubjects.click('statusDropdown');
      await testSubjects.click('statusDropdownSnoozeItem');
      await testSubjects.setValue('ruleSnoozeIntervalValue', '3');
      expect(await testSubjects.exists('ruleSnoozePreviousText')).to.be(true);
      expect(await testSubjects.getVisibleText('ruleSnoozePreviousText')).to.be('10 hours');
    });
  });
};
