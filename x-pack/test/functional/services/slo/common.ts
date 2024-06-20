/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { sloData } from '../../../api_integration/apis/slos/fixtures/create_slo';

const OVERVIEW_MODE_SELECTOR = 'sloOverviewModeSelector';
const SLO_CONFIRM_BUTTON = 'sloConfirmButton';
const SINGLE_SLO_SELECTOR = 'singleSloSelector';
const SLO_SINGLE_OVERVIEW_CONFIGURATION = 'sloSingleOverviewConfiguration';
const SLO_GROUP_OVERVIEW_CONFIGURATION = 'sloGroupOverviewConfiguration';
const SLO_GROUP_OVERVIEW_CONFIGURATION_GROUP_BY = 'sloGroupOverviewConfigurationGroupBy';
const SLO_GROUP_OVERVIEW_CONFIGURATION_GROUP = 'sloGroupOverviewConfigurationGroup';
const SLO_GROUP_OVERVIEW_CONFIGURATION_KQLBAR = 'sloGroupOverviewConfigurationKqlBar';
const SLO_SINGLE_OVERVIEW_PANEL = 'sloSingleOverviewPanel';
const SLO_GROUP_OVERVIEW_PANEL = 'sloGroupOverviewPanel';

export function SloUiCommonServiceProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const find = getService('find');
  const toasts = getService('toasts');
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
        await comboBox.set('sloSelector > comboBoxInput', sloData.name);
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

    async assertGroupOverviewConfigurationGroupByExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_CONFIGURATION_GROUP_BY);
      });
    },

    async assertGroupOverviewConfigurationGroupExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_CONFIGURATION_GROUP);
      });
    },

    async assertGroupOverviewConfigurationKqlBarExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_CONFIGURATION_KQLBAR);
      });
    },

    async dismissAllToasts() {
      await retry.tryForTime(60 * 1000, async () => {
        await toasts.dismissAll();
      });
    },

    async assertSingleOverviewPanelExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_SINGLE_OVERVIEW_PANEL);
      });
    },

    async getSloCardTitle() {
      const container = await testSubjects.find(SLO_SINGLE_OVERVIEW_PANEL);
      return await (await container.findByClassName('echMetricText__title')).getVisibleText();
    },

    async assertSingleOverviewPanelContentExists() {
      await retry.tryForTime(2000, async () => {
        expect(
          await find.existsByCssSelector(
            `[data-test-subj="${SLO_SINGLE_OVERVIEW_PANEL}"] .echChart`
          )
        ).to.eql(true);

        expect(
          await find.existsByCssSelector(
            `[data-test-subj="${SLO_SINGLE_OVERVIEW_PANEL}"] .echMetricText__title`
          )
        ).to.eql(true);

        expect(await this.getSloCardTitle()).to.eql(sloData.name);
      });
    },

    async assertGroupOverviewPanelExists() {
      await retry.tryForTime(60 * 1000, async () => {
        await testSubjects.existOrFail(SLO_GROUP_OVERVIEW_PANEL);
      });
    },
  };
}
