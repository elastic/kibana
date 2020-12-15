/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, getPageObjects }) {
  describe('APM smoke test', function ampsmokeTest() {
    const browser = getService('browser');
    const testSubjects = getService('testSubjects');
    const PageObjects = getPageObjects(['common', 'timePicker']);
    const find = getService('find');
    const log = getService('log');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('apm');
      await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
    });

    it('can navigate to APM app', async () => {
      await testSubjects.existOrFail('apmMainContainer', {
        timeout: 10000,
      });
      await find.clickByLinkText('apm-a-rum-test-e2e-general-usecase');
      log.debug('### apm smoke test passed');
      await find.clickByLinkText('general-usecase-initial-p-load');
      log.debug('### general use case smoke test passed');
    });
  });
}
