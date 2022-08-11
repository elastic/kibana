/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

export function ExplainLogRateSpikesProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('aiopsTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText('aiopsTotalDocCount');
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async clickUseFullDataButton(expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled('aiopsExplainLogRatesSpikeButtonUseFullData');
        await testSubjects.clickWhenNotDisabled('superDatePickerApplyTimeButton');
        await this.assertTotalDocumentCount(expectedFormattedTotalDocCount);
      });
    },

    async assertTotalDocCountHeaderExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsTotalDocCountHeader`);
      });
    },

    async assertTotalDocCountChartExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsDocumentCountChart`);
      });
    },

    async assertSearchPanelExist() {
      await testSubjects.existOrFail(`aiopsSearchPanel`);
    },

    async assertNoWindowParametersEmptyPromptExist() {
      await testSubjects.existOrFail(`aiopsNoWindowParametersEmptyPrompt`);
    },

    async navigateToIndexPatternSelection() {
      await testSubjects.click('mlMainTab explainLogRateSpikes');
      await testSubjects.existOrFail('mlPageSourceSelection');
    },
  };
}
