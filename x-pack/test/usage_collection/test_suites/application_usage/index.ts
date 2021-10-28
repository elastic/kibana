/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { applicationUsageSchema } from '../../../../../src/plugins/kibana_usage_collection/server/collectors/application_usage/schema';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/90536
  describe.skip('Application Usage', function () {
    this.tags('ciGroup1');
    const { common } = getPageObjects(['common']);
    const browser = getService('browser');

    it('keys in the schema match the registered application IDs', async () => {
      await common.navigateToApp('home'); // Navigate to Home
      await common.isChromeVisible(); // Make sure the page is fully loaded
      const appIds = await browser.execute(() => window.__applicationIds__);
      if (!appIds || !Array.isArray(appIds)) {
        throw new Error(
          'Failed to retrieve all the existing applications in Kibana. Did it fail to boot or to navigate to home?'
        );
      }
      try {
        expect(Object.keys(applicationUsageSchema).sort()).to.eql(appIds.sort());
      } catch (err) {
        err.message = `Application Usage's schema is not up-to-date with the actual registered apps. Please update it at src/plugins/kibana_usage_collection/server/collectors/application_usage/schema.ts.\n${err.message}`;
        throw err;
      }
    });
  });
}
