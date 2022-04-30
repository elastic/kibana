/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningForecastProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
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

    async assertForecastChartElementsExists() {
      await testSubjects.existOrFail(`mlForecastArea`, {
        timeout: 30 * 1000,
      });
      await testSubjects.existOrFail(`mlForecastValuesline`, {
        timeout: 30 * 1000,
      });
      await testSubjects.existOrFail(`mlForecastMarkers`, {
        timeout: 30 * 1000,
      });
    },

    async assertForecastChartElementsHidden() {
      await testSubjects.missingOrFail(`mlForecastArea`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
      await testSubjects.missingOrFail(`mlForecastValuesline`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
      await testSubjects.missingOrFail(`mlForecastMarkers`, {
        allowHidden: true,
        timeout: 30 * 1000,
      });
    },

    async assertForecastCheckboxExists() {
      await testSubjects.existOrFail(`mlForecastCheckbox`, {
        timeout: 30 * 1000,
      });
    },

    async assertForecastCheckboxMissing() {
      await testSubjects.missingOrFail(`mlForecastCheckbox`, {
        timeout: 30 * 1000,
      });
    },

    async clickForecastCheckbox() {
      await testSubjects.click('mlForecastCheckbox');
    },

    async openForecastModal() {
      await testSubjects.click(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
      );
      await testSubjects.existOrFail('mlModalForecast');
    },

    async closeForecastModal() {
      await testSubjects.click('mlModalForecast > mlModalForecastButtonClose');
      await this.assertForecastModalMissing();
    },

    async assertForecastModalMissing() {
      await testSubjects.missingOrFail(`mlModalForecast`, {
        timeout: 30 * 1000,
      });
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

    async assertForecastTableExists() {
      await testSubjects.existOrFail('mlModalForecast > mlModalForecastTable');
    },

    async clickForecastModalRunButton() {
      await testSubjects.click('mlModalForecast > mlModalForecastButtonRun');
      await this.assertForecastModalMissing();
    },

    async getForecastTableRows() {
      return await testSubjects.findAll('mlModalForecastTable > ~mlForecastsListRow');
    },

    async assertForecastTableNotEmpty() {
      const tableRows = await this.getForecastTableRows();
      expect(tableRows.length).to.be.greaterThan(
        0,
        `Forecast table should have at least one row (got '${tableRows.length}')`
      );
    },
  };
}
