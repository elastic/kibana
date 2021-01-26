/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import _ from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { stackManagementSchema } from '../../../../../src/plugins/kibana_usage_collection/server/collectors/management/schema';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('Stack Management', function () {
    this.tags('ciGroup1');
    const { common } = getPageObjects(['common']);
    const browser = getService('browser');

    let registeredSettings: Record<string, any>;

    before(async () => {
      await common.navigateToApp('home'); // Navigate to Home to make sure all the appIds are loaded
      registeredSettings = await browser.execute(() => window.__registeredUiSettings__);
    });

    it('registers all UI Settings in the UsageStats interface', () => {
      const unreportedUISettings = Object.keys(registeredSettings)
        .filter((key) => key !== 'buildNum')
        .filter((key) => typeof _.get(stackManagementSchema, key) === 'undefined');

      expect(unreportedUISettings).to.eql([]);
    });

    it('registers all sensitive UI settings as boolean type', async () => {
      const sensitiveSettings = Object.entries(registeredSettings)
        .filter(([, config]) => config.sensitive)
        .map(([key]) => key);

      const nonBooleanSensitiveProps = sensitiveSettings
        .map((key) => ({ key, ..._.get(stackManagementSchema, key) }))
        .filter((keyDescriptor) => keyDescriptor.type !== 'keyword');

      expect(nonBooleanSensitiveProps).to.eql([]);
    });
  });
}
