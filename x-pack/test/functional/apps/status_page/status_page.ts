/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function statusPageFunctonalTests({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security', 'statusPage', 'home']);

  // FLAKY: https://github.com/elastic/kibana/issues/50448
  describe.skip('Status Page', function () {
    this.tags(['skipCloud', 'includeFirefox']);
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => await esArchiver.unload('empty_kibana'));

    it('allows user to navigate without authentication', async () => {
      await PageObjects.security.forceLogout();
      await PageObjects.statusPage.navigateToPage();
      await PageObjects.statusPage.expectStatusPage();
    });
  });
}
