/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestInvoker } from './lib/types';

// eslint-disable-next-line import/no-default-export
export default function statusPageFunctonalTests({ getService, getPageObjects }: TestInvoker) {
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['security', 'statusPage', 'home']);

  describe('Status Page', () => {
    before(async () => await esArchiver.load('empty_kibana'));
    after(async () => await esArchiver.unload('empty_kibana'));

    it('allows user to navigate without authentication', async () => {
      await PageObjects.security.logout();
      await PageObjects.statusPage.navigateToPage();
      await PageObjects.statusPage.expectStatusPage();
    });
  });
}
