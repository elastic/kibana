/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function SloUiCommonServiceProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const retry = getService('retry');

  return {
    async assertConfigurationSaveButtonIsEnabled(subj: string) {
      await testSubjects.existOrFail(subj);
      await testSubjects.isEnabled(subj);
    },
    async clickCofigurationSaveButton() {
      const saveButton = 'sloConfirmButton';
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertConfigurationSaveButtonIsEnabled(saveButton);
        await testSubjects.clickWhenNotDisabledWithoutRetry(saveButton);
      });
    },

    async assertOverviewPanelExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail('sloSingleOverviewPanel');
      });
    },
  };
}
