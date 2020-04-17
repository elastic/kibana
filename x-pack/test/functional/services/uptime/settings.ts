/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function UptimeSettingsProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  const changeInputField = async (text: string, field: string) => {
    const input = await testSubjects.find(field, 5000);
    await input.clearValueWithKeyboard();
    await input.type(text);
  };

  return {
    go: async () => {
      await testSubjects.click('settings-page-link', 5000);
    },

    changeHeartbeatIndicesInput: async (text: string) => {
      await changeInputField(text, 'heartbeat-indices-input-loaded');
    },
    changeErrorThresholdInput: async (text: string) => {
      await changeInputField(text, 'error-state-threshold-input-loaded');
    },
    changeWarningThresholdInput: async (text: string) => {
      await changeInputField(text, 'warning-state-threshold-input-loaded');
    },
    loadFields: async () => {
      const indInput = await testSubjects.find('heartbeat-indices-input-loaded', 5000);
      const errorInput = await testSubjects.find('error-state-threshold-input-loaded', 5000);
      const warningInput = await testSubjects.find('warning-state-threshold-input-loaded', 5000);
      const heartbeatIndices = await indInput.getAttribute('value');
      const errorThreshold = await errorInput.getAttribute('value');
      const warningThreshold = await warningInput.getAttribute('value');

      return {
        heartbeatIndices,
        certificatesThresholds: {
          errorState: errorThreshold,
          warningState: warningThreshold,
        },
      };
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
