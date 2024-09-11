/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DEFAULT_INPUT_VALUE } from '@kbn/console-plugin/common/constants';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const retry = getService('retry');
  const log = getService('log');
  const PageObjects = getPageObjects(['svlCommonPage', 'common', 'console', 'header']);

  describe('console app', function describeIndexTests() {
    before(async () => {
      // TODO: https://github.com/elastic/kibana/issues/176582
      // this test scenario requires roles definition check:
      // Search & Oblt projects 'viewer' role has access to Console, but for
      // Security project only 'admin' role has access
      await PageObjects.svlCommonPage.loginAsAdmin();
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/console' });
    });

    beforeEach(async () => {
      await PageObjects.console.closeHelpIfExists();
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.monaco.getEditorText();
        log.debug(actualRequest);
        expect(actualRequest.replace(/\s/g, '')).to.eql(DEFAULT_INPUT_VALUE.replace(/\s/g, ''));
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.monaco.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.monaco.getOutputText();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });
  });
}
