/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningDataDriftProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'header']);
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');

  type RandomSamplerOption =
    | 'dvRandomSamplerOptionOnAutomatic'
    | 'dvRandomSamplerOptionOnManual'
    | 'dvRandomSamplerOptionOff';

  return {
    getDataTestSubject(testSubject: string, id?: string) {
      if (!id) return testSubject;
      return `${testSubject}-${id}`;
    },

    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('dataComparisonTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(selector: string, expectedFormattedTotalDocCount: string) {
      await retry.tryForTime(5000, async () => {
        const docCount = await testSubjects.getVisibleText(selector);
        expect(docCount).to.eql(
          expectedFormattedTotalDocCount,
          `Expected total document count to be '${expectedFormattedTotalDocCount}' (got '${docCount}')`
        );
      });
    },

    async assertRandomSamplingOptionsButtonExists(id: string) {
      await testSubjects.existOrFail(
        this.getDataTestSubject('aiopsRandomSamplerOptionsButton', id)
      );
    },

    async assertNoWindowParametersEmptyPromptExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('dataDriftNoWindowParametersEmptyPrompt');
      });
    },

    async assertRandomSamplingOption(
      id: string,
      expectedOption: RandomSamplerOption,
      expectedProbability?: number
    ) {
      await retry.tryForTime(20000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        await testSubjects.clickWhenNotDisabled(
          this.getDataTestSubject('aiopsRandomSamplerOptionsButton', id)
        );
        await testSubjects.existOrFail(
          this.getDataTestSubject('aiopsRandomSamplerOptionsPopover', id)
        );

        if (expectedOption === 'dvRandomSamplerOptionOff') {
          await testSubjects.existOrFail('dvRandomSamplerOptionOff', { timeout: 1000 });
          await testSubjects.missingOrFail('dvRandomSamplerProbabilityRange', { timeout: 1000 });
          await testSubjects.missingOrFail('dvRandomSamplerProbabilityUsedMsg', {
            timeout: 1000,
          });
        }

        if (expectedOption === 'dvRandomSamplerOptionOnManual') {
          await testSubjects.existOrFail('dvRandomSamplerOptionOnManual', { timeout: 1000 });
          await testSubjects.existOrFail('dvRandomSamplerProbabilityRange', { timeout: 1000 });
          if (expectedProbability !== undefined) {
            const probability = await testSubjects.getAttribute(
              'dvRandomSamplerProbabilityRange',
              'value'
            );
            expect(probability).to.eql(
              `${expectedProbability}`,
              `Expected probability to be ${expectedProbability}, got ${probability}`
            );
          }
        }

        if (expectedOption === 'dvRandomSamplerOptionOnAutomatic') {
          await testSubjects.existOrFail('dvRandomSamplerOptionOnAutomatic', { timeout: 1000 });
          await testSubjects.existOrFail('dvRandomSamplerProbabilityUsedMsg', {
            timeout: 1000,
          });

          if (expectedProbability !== undefined) {
            const probabilityText = await testSubjects.getVisibleText(
              'dvRandomSamplerProbabilityUsedMsg'
            );
            expect(probabilityText).to.contain(
              `${expectedProbability}`,
              `Expected probability text to contain ${expectedProbability}, got ${probabilityText}`
            );
          }
        }
      });
    },

    async setRandomSamplingOption(id: string, option: RandomSamplerOption) {
      await retry.tryForTime(20000, async () => {
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);
        await this.assertRandomSamplingOptionsButtonExists(id);
        await testSubjects.clickWhenNotDisabled(
          this.getDataTestSubject('aiopsRandomSamplerOptionsButton', id)
        );
        await testSubjects.existOrFail(
          this.getDataTestSubject('aiopsRandomSamplerOptionsPopover', id),
          { timeout: 1000 }
        );

        await testSubjects.clickWhenNotDisabled(
          this.getDataTestSubject('aiopsRandomSamplerOptionsSelect', id)
        );

        await testSubjects.existOrFail('dvRandomSamplerOptionOff', { timeout: 1000 });
        await testSubjects.existOrFail('dvRandomSamplerOptionOnManual', { timeout: 1000 });
        await testSubjects.existOrFail('dvRandomSamplerOptionOnAutomatic', { timeout: 1000 });

        await testSubjects.click(option);

        await this.assertRandomSamplingOption(id, option);
      });
    },

    async clickUseFullDataButton() {
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry('mlDatePickerButtonUseFullData');
        await testSubjects.clickWhenNotDisabledWithoutRetry('superDatePickerApplyTimeButton');
        await PageObjects.header.waitUntilLoadingHasFinished();
      });
    },

    async assertPrimarySearchBarExists() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataVisualizerQueryInput`);
      });
    },
    async assertDocCountContent(id: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(this.getDataTestSubject(`dataDriftTotalDocCountHeader`, id));
        await testSubjects.existOrFail(this.getDataTestSubject(`dataDriftDocCountChart`, id));

        const parent = await testSubjects.find(
          this.getDataTestSubject(`dataDriftTotalDocCountHeader`, id)
        );
        const subQueryBar = await testSubjects.findDescendant(`globalQueryBar`, parent);
        expect(subQueryBar).not.eql(
          undefined,
          `Expected secondary query bar exists inside ${this.getDataTestSubject(
            `dataDriftTotalDocCountHeader`,
            id
          )}, got ${subQueryBar}`
        );
      });
    },

    async assertReferenceDocCountContent() {
      await this.assertDocCountContent('Reference');
    },

    async assertComparisonDocCountContent() {
      await this.assertDocCountContent('Comparison');
    },

    async assertHistogramBrushesExist() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`aiopsHistogramBrushes`);
        // As part of the interface for the histogram brushes, the button to clear the selection should be present
        await testSubjects.existOrFail(`aiopsClearSelectionBadge`);
      });
    },

    async clickDocumentCountChart(dataTestSubj: string, chartClickCoordinates: [number, number]) {
      await elasticChart.waitForRenderComplete();
      const el = await elasticChart.getCanvas(dataTestSubj);

      await browser
        .getActions()
        .move({ x: chartClickCoordinates[0], y: chartClickCoordinates[1], origin: el._webElement })
        .click()
        .perform();

      await this.assertHistogramBrushesExist();
    },

    async assertDataDriftTableExists() {
      await testSubjects.existOrFail(`mlDataDriftTable`);
    },

    async runAnalysis() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(`aiopsRerunAnalysisButton`);
        // As part of the interface for the histogram brushes, the button to clear the selection should be present
        await this.assertDataDriftTableExists();
      });
    },
  };
}
