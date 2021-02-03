/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { applicationUsageSchema } from '../../../../../src/plugins/kibana_usage_collection/server/collectors/application_usage/schema';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('Application Usage', function () {
    this.tags('ciGroup1');
    const { common } = getPageObjects(['common']);
    const browser = getService('browser');

    it('keys in the schema match the registered application IDs', async () => {
      await common.navigateToApp('home'); // Navigate to Home to make sure all the appIds are loaded
      const appIds = await browser.execute(() => window.__applicationIds__);
      try {
        expect(Object.keys(applicationUsageSchema).sort()).to.eql(appIds.sort());
      } catch (err) {
        err.message = `Application Usage's schema is not up-to-date with the actual registered apps. Please update it at src/plugins/kibana_usage_collection/server/collectors/application_usage/schema.ts.\n${err.message}`;
        throw err;
      }
    });
  });
}
