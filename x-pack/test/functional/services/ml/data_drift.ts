/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

type SubjectId = 'reference' | 'comparison';

export function MachineLearningDataDriftProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['discover', 'header']);
  const elasticChart = getService('elasticChart');
  const browser = getService('browser');
  const comboBox = getService('comboBox');

  type RandomSamplerOption =
    | 'dvRandomSamplerOptionOnAutomatic'
    | 'dvRandomSamplerOptionOnManual'
    | 'dvRandomSamplerOptionOff';

  return {
    getDataTestSubject(testSubject: string, id?: string) {
      if (!id) return testSubject;
      return `${testSubject}-${id}`;
    },

    async assertDataViewTitle(expectedTitle: string) {
      const selector = 'mlDataDriftPageDataViewTitle';
      await testSubjects.existOrFail(selector);
      await retry.tryForTime(5000, async () => {
        const title = await testSubjects.getVisibleText(selector);
        expect(title).to.eql(
          expectedTitle,
          `Expected data drift page's data view title to be '${expectedTitle}' (got '${title}')`
        );
      });
    },

    async assertTimeRangeSelectorSectionExists() {
      await testSubjects.existOrFail('dataComparisonTimeRangeSelectorSection');
    },

    async assertTotalDocumentCount(
      id: 'Reference' | 'Comparison',
      expectedFormattedTotalDocCount: string
    ) {
      const selector = `dataVisualizerTotalDocCount-${id}`;
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

    async assertHistogramBrushesExist(id: 'Reference' | 'Comparison' = 'Reference') {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`dataDriftBrush-${id}`);
      });
    },

    async clickDocumentCountChart(
      id: 'Reference' | 'Comparison',
      chartClickCoordinates: [number, number]
    ) {
      const dataTestSubj = `dataDriftDocCountChart-${id}`;
      await elasticChart.waitForRenderComplete();
      const el = await elasticChart.getCanvas(dataTestSubj);

      await browser
        .getActions()
        .move({ x: chartClickCoordinates[0], y: chartClickCoordinates[1], origin: el._webElement })
        .click()
        .perform();

      await this.assertHistogramBrushesExist(id);
    },

    async assertDataDriftTableExists() {
      await testSubjects.existOrFail(`mlDataDriftTable`);
    },

    async assertRunAnalysisButtonState(disabled: boolean) {
      await retry.tryForTime(5000, async () => {
        const isDisabled = !(await testSubjects.isEnabled('runDataDriftAnalysis'));
        expect(isDisabled).to.equal(
          disabled,
          `Expect runDataDriftAnalysis button disabled state to be ${disabled} (got ${isDisabled})`
        );
      });
    },

    async runAnalysis() {
      await retry.tryForTime(10000, async () => {
        await testSubjects.click(`runDataDriftAnalysis`);
        await this.assertDataDriftTableExists();
      });
    },

    async navigateToCreateNewDataViewPage() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(`dataDriftCreateDataViewButton`);
        await testSubjects.existOrFail(`mlPageDataDriftCustomIndexPatterns`);
      });
    },

    async assertIndexPatternNotEmptyFormErrorExists(id: SubjectId) {
      const subj = `mlDataDriftIndexPatternFormRow-${id ?? ''}`;
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(subj);
        const row = await testSubjects.find(subj);
        const errorElements = await row.findAllByClassName('euiFormErrorText');
        expect(await errorElements[0].getVisibleText()).eql('Index pattern must not be empty.');
      });
    },

    async assertIndexPatternInput(id: SubjectId, expectedText: string) {
      const inputSelector = `mlDataDriftIndexPatternTitleInput-${id}`;

      await retry.tryForTime(5000, async () => {
        const input = await testSubjects.find(inputSelector);
        const text = await input.getAttribute('value');
        expect(text).eql(
          expectedText,
          `Expected ${inputSelector} to have text ${expectedText} (got ${text})`
        );
      });
    },

    async setIndexPatternInput(id: SubjectId, pattern: string) {
      const inputSelector = `mlDataDriftIndexPatternTitleInput-${id}`;

      // The input for index pattern automatically appends "*" at the end of the string
      // So here we just omit that * at the end to avoid double characters

      await retry.tryForTime(10 * 1000, async () => {
        const hasWildCard = pattern.endsWith('*');
        const trimmedPattern = hasWildCard ? pattern.substring(0, pattern.length - 1) : pattern;

        const input = await testSubjects.find(inputSelector);
        await input.clearValue();

        await testSubjects.setValue(inputSelector, trimmedPattern, {
          clearWithKeyboard: true,
          typeCharByChar: true,
        });

        if (!hasWildCard) {
          // If original pattern does not have wildcard, make to delete the wildcard
          await input.focus();
          await browser.pressKeys(browser.keys.DELETE);
        }

        await this.assertIndexPatternInput(id, pattern);
      });
    },

    async assertAnalyzeWithoutSavingButtonMissing() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.missingOrFail('analyzeDataDriftWithoutSavingButton');
      });
    },

    async assertAnalyzeWithoutSavingButtonState(disabled = true) {
      await retry.tryForTime(5000, async () => {
        const isDisabled = !(await testSubjects.isEnabled('analyzeDataDriftWithoutSavingButton'));
        expect(isDisabled).to.equal(
          disabled,
          `Expect analyze without saving button disabled state to be ${disabled} (got ${isDisabled})`
        );
      });
    },

    async assertAnalyzeDataDriftButtonState(disabled = true) {
      await retry.tryForTime(5000, async () => {
        const isDisabled = !(await testSubjects.isEnabled('analyzeDataDriftButton'));
        expect(isDisabled).to.equal(
          disabled,
          `Expect analyze data drift button disabled state to be ${disabled} (got ${isDisabled})`
        );
      });
    },

    async clickAnalyzeWithoutSavingButton() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('analyzeDataDriftWithoutSavingButton');
        await testSubjects.click('analyzeDataDriftWithoutSavingButton');
        await testSubjects.existOrFail(`mlPageDataDriftCustomIndexPatterns`);
      });
    },

    async clickAnalyzeDataDrift() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail('analyzeDataDriftButton');
        await testSubjects.click('analyzeDataDriftButton');
        await testSubjects.existOrFail(`mlPageDataDriftCustomIndexPatterns`);
      });
    },

    async assertDataDriftTimestampField(expectedIdentifier: string) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'mlDataDriftTimestampField > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier === '' ? [] : [expectedIdentifier],
          `Expected type field to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async selectTimeField(timeFieldName: string) {
      await comboBox.set('mlDataDriftTimestampField', timeFieldName);

      await this.assertDataDriftTimestampField(timeFieldName);
    },
  };
}
