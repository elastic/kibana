/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['common', 'console']);

  describe('Integration Tests - Console App CCS', function describeIndexTests() {
    this.tags('includeFirefox');
    before(async () => {
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('console');
      await PageObjects.common.dismissBanner();
      await retry.try(async () => {
        await PageObjects.console.collapseHelp();
      });
    });

    describe('Perform CCS Search in Console', () => {
      before(async () => {
        await PageObjects.console.clearTextArea();
      });
      it('it should be able to access remote data', async () => {
        await PageObjects.console.enterRequest(
          '\nGET ftr-remote:makelogs工程-*/_search\n {\n "query": {\n "bool": {\n "must": [\n {"match": {"extension" : "jpg"'
        );
        await PageObjects.console.clickPlay();
        await retry.try(async () => {
          const actualResponse = await PageObjects.console.getResponse();
          expect(actualResponse).to.contain('"_index": "ftr-remote:makelogs工程-0"');
        });
      });
    });
  });
}
