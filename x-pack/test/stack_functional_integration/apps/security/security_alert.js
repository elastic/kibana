/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function ({ getService, getPageObjects }) {
  describe('security alert warning', function sampleData() {
    const browser = getService('browser');
    const PageObjects = getPageObjects(['common', 'home']);
    const testSubjects = getService('testSubjects');
    const find = getService('find');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('home');
      await PageObjects.common.sleep(3000);
    });

    it('should show a security warning when security is not enabled', async () => {
      await testSubjects.find('insecureClusterAlertText');
      const checkbox = await find.byCssSelector('persistDismissedAlertPreference');
      checkbox.click();
      await testSubjects.click('dismissAlertButton');
    });
  });
}
