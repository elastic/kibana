/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function statusPageFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const PageObjects = getPageObjects(['statusPage']);

  describe('Status Page', function() {
    this.tags('smoke');
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => await esArchiver.unload('empty_kibana'));

    it('allows user to navigate without authentication', async () => {
      await security.logout();
      await PageObjects.statusPage.navigateToPage();
      await PageObjects.statusPage.expectStatusPage();
    });
  });
}
