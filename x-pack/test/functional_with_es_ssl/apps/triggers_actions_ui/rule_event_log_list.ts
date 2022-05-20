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

  describe('Rule event log list', function () {
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
      await testSubjects.find('ruleEventLogList');
      const exists = await testSubjects.exists('ruleEventLogList');
      expect(exists).to.be(true);
    });
  });
};
