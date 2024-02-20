/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

const DEFAULT_REQUEST = `

# Click the Variables button, above, to create your own variables.
GET \${exampleVariable1} // _search
{
  "query": {
    "\${exampleVariable2}": {} // match_all
  }
}

`.trim();

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
      await PageObjects.svlCommonPage.loginWithRole('admin');
      log.debug('navigateTo console');
      await PageObjects.common.navigateToApp('dev_tools', { hash: '/console' });
    });

    beforeEach(async () => {
      await PageObjects.console.closeHelpIfExists();
    });

    it('should show the default request', async () => {
      await retry.try(async () => {
        const actualRequest = await PageObjects.console.getRequest();
        log.debug(actualRequest);
        expect(actualRequest.trim()).to.eql(DEFAULT_REQUEST);
      });
    });

    it('default request response should include `"timed_out" : false`', async () => {
      const expectedResponseContains = `"timed_out": false`;
      await PageObjects.console.selectAllRequests();
      await PageObjects.console.clickPlay();
      await retry.try(async () => {
        const actualResponse = await PageObjects.console.getResponse();
        log.debug(actualResponse);
        expect(actualResponse).to.contain(expectedResponseContains);
      });
    });
  });
}
