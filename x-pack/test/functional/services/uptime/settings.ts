/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeSettingsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    go: async () => {
      await testSubjects.click('settings-page-link', 5000);
    },
    changeHeartbeatIndicesInput: async (text: string) => {
      const input = await testSubjects.find('heartbeat-indices-input-loaded', 5000);
      await input.clearValueWithKeyboard();
      await input.type(text);
    },
    loadFields: async () => {
      const input = await testSubjects.find('heartbeat-indices-input-loaded', 5000);
      const heartbeatIndices = await input.getAttribute('value');

      return { heartbeatIndices };
    },
    applyButtonIsDisabled: async () => {
      return !!(await (await testSubjects.find('apply-settings-button')).getAttribute('disabled'));
    },
    apply: async () => {
      await (await testSubjects.find('apply-settings-button')).click();
      await retry.waitFor('submit to succeed', async () => {
        // When the form submit is complete the form will no longer be disabled
        const disabled = await (
          await testSubjects.find('heartbeat-indices-input-loaded', 5000)
        ).getAttribute('disabled');
        return disabled === null;
      });
    },
  };
}
