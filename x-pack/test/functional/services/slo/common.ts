/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

const OVERVIEW_MODE_SELECTOR = 'sloOverviewModeSelector';
const SLO_CONFIRM_BUTTON = 'sloConfirmButton';
const SINGLE_SLO_SELECTOR = 'singleSloSelector';
const SLO_SINGLE_OVERVIEW_CONFIGURATION = 'sloSingleOverviewConfiguration';
const SLO_GROUP_OVERVIEW_CONFIGURATION = 'sloGroupOverviewConfiguration';
const SLO_SINGLE_OVERVIEW_PANEL = 'sloSingleOverviewPanel';
const SLO_GROUP_OVERVIEW_PANEL = 'sloGroupOverviewPanel';

export function SloUiCommonServiceProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const retry = getService('retry');

  return {
    async assertSloOverviewConfigurationExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_SINGLE_OVERVIEW_CONFIGURATION);
      });
    },
    async assertOverviewSloSelectorExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SINGLE_SLO_SELECTOR);
      });
    },
    async setComboBoxSloSelection() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.click('sloSelector');
        await comboBox.set('sloSelector > comboBoxInput', 'Test SLO for api integration');
      });
    },
    async assertOverviewConfigurationSaveButtonIsEnabled(subj: string) {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(subj);
        await testSubjects.isEnabled(subj);
      });
    },
    async clickOverviewCofigurationSaveButton() {
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertOverviewConfigurationSaveButtonIsEnabled(SLO_CONFIRM_BUTTON);
        await testSubjects.clickWhenNotDisabledWithoutRetry(SLO_CONFIRM_BUTTON);
      });
    },

    async assertOverviewModeSelectorExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(OVERVIEW_MODE_SELECTOR);
      });
    },

    async clickOverviewMode() {
      await retry.tryForTime(60 * 1000, async () => {
        await this.assertOverviewModeSelectorExists();
        await testSubjects.click(OVERVIEW_MODE_SELECTOR);
      });
    },

    async assertSloConfigurationGroupOverviewModeIsSelected() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_CONFIGURATION);
      });
    },

    async assertSingleOverviewPanelExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_SINGLE_OVERVIEW_PANEL);
      });
    },

    async assertGroupOverviewPanelExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_PANEL);
      });
    },
  };
}
