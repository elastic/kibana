/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  describe('console app', function describeIndexTests() {
    const PageObjects = getPageObjects(['common', 'settings']);
    const retry = getService('retry');
    const log = getService('log');
    const screenshot = getService('screenshots');

    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
    });

    it('should show the default request', async () => {
      const expectedRequest = [
        'GET _search',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }',
        '}',
        '',
      ];
      await screenshot.take('Console-help-expanded');
      // collapse the help pane because we only get the VISIBLE TEXT, not the part that is scrolled
      await PageObjects.console.collapseHelp();
      await screenshot.take('Console-help-collapsed');
      await PageObjects.common.tryForTime(10000, async () => {
        const actualRequest = await PageObjects.console.getRequest();
        expect(actualRequest).to.eql(expectedRequest);
      });
    });

    it('default request response should contain failed 0', async () => {
      const expectedResponseContains = '"failed": 0';
      await PageObjects.console.clickPlay();
      await screenshot.take('Console-default-request');
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });
  });
};
