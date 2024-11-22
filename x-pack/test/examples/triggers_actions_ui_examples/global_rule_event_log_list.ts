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

  describe('Global rule event log list', function () {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/observability/alerts');
      await PageObjects.common.navigateToApp('triggersActionsUiExample/global_rule_event_log_list');
    });
    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/observability/alerts');
    });

    it('should load from the shareable lazy loader', async () => {
      await testSubjects.find('ruleEventLogListTable');
      const exists = await testSubjects.exists('ruleEventLogListTable');
      expect(exists).to.be(true);
    });
  });
};
