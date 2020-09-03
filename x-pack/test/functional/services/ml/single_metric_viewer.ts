/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSingleMetricViewerProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertSingleMetricViewerEmptyListMessageExsist() {
      await testSubjects.existOrFail('mlNoSingleMetricJobsFound');
    },

    async assertForecastButtonExists() {
      await testSubjects.existOrFail(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
    },

    async assertForecastButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected "forecast" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async assertDetectorInputExsist() {
      await testSubjects.existOrFail(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerDetectorSelect'
      );
    },

    async assertDetectorInputValue(expectedDetectorOptionValue: string) {
      const actualDetectorValue = await testSubjects.getAttribute(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerDetectorSelect',
        'value'
      );
      expect(actualDetectorValue).to.eql(
        expectedDetectorOptionValue,
        `Detector input option value should be '${expectedDetectorOptionValue}' (got '${actualDetectorValue}')`
      );
    },

    async setDetectorInputValue(detectorOptionValue: string) {
      await testSubjects.selectValue(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerDetectorSelect',
        detectorOptionValue
      );
      await this.assertDetectorInputValue(detectorOptionValue);
    },

    async assertEntityInputExsist(entityFieldName: string) {
      await testSubjects.existOrFail(`mlSingleMetricViewerEntitySelection ${entityFieldName}`);
    },

    async assertEntityInputSelection(entityFieldName: string, expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        `mlSingleMetricViewerEntitySelection ${entityFieldName}  > comboBoxInput`
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected entity field selection for '${entityFieldName}' to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectEntityValue(entityFieldName: string, entityFieldValue: string) {
      await comboBox.set(
        `mlSingleMetricViewerEntitySelection ${entityFieldName}  > comboBoxInput`,
        entityFieldValue
      );
      await this.assertEntityInputSelection(entityFieldName, [entityFieldValue]);
    },

    async assertChartExsist() {
      await testSubjects.existOrFail('mlSingleMetricViewerChart');
    },

    async assertAnnotationsExists(state: string) {
      await testSubjects.existOrFail(`mlAnomalyExplorerAnnotations ${state}`, {
        timeout: 30 * 1000,
      });
    },

    async openForecastModal() {
      await testSubjects.click(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
      await testSubjects.existOrFail('mlModalForecast');
    },

    async closeForecastModal() {
      await testSubjects.click('mlModalForecast > mlModalForecastButtonClose');
      await testSubjects.missingOrFail('mlModalForecast');
    },

    async assertForecastModalRunButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlModalForecast > mlModalForecastButtonRun');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected forecast "run" button to be '${expectedValue ? 'enabled' : 'disabled'}' (got '${
          isEnabled ? 'enabled' : 'disabled'
        }')`
      );
    },

    async openAnomalyExplorer() {
      await testSubjects.click('mlAnomalyResultsViewSelectorExplorer');
      await testSubjects.existOrFail('mlPageAnomalyExplorer');
    },
  };
}
