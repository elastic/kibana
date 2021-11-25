/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';
import { stackManagementSchema } from '../../../../../src/plugins/kibana_usage_collection/server/collectors/management/schema';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  // FLAKY: https://github.com/elastic/kibana/issues/119038
  describe.skip('Stack Management', function () {
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

      if (unreportedUISettings.length) {
        throw new Error(
          `Detected the following unregistered UI Settings in the stack management collector:
          ${JSON.stringify(unreportedUISettings, null)}
          Update the management collector schema and its UsageStats interface.
          Refer to src/plugins/kibana_usage_collection/server/collectors/management/README.md for additional information.
        `
        );
      }
    });

    it('registers all sensitive UI settings as keyword type', async () => {
      const sensitiveSettings = Object.entries(registeredSettings)
        .filter(([, config]) => config.sensitive)
        .map(([key]) => key);

      const nonBooleanSensitiveProps = sensitiveSettings
        .map((key) => ({ key, ..._.get(stackManagementSchema, key) }))
        .filter((keyDescriptor) => keyDescriptor.type !== 'keyword');

      if (nonBooleanSensitiveProps.length) {
        throw new Error(
          `Detected the following sensitive UI Settings in the stack management collector not having a 'keyword' type:
          ${JSON.stringify(nonBooleanSensitiveProps, null)}
          Update each setting in the management collector schema with ({ type: 'keyword' }).
          Refer to src/plugins/kibana_usage_collection/server/collectors/management/README.md for additional information.
        `
        );
      }
    });
  });
}
