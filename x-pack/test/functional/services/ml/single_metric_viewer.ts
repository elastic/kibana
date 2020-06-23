/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningSingleMetricViewerProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertSingleMetricViewerEmptyListMessageExsist() {
      await testSubjects.existOrFail('mlNoSingleMetricJobsFound');
    },

    async assertForecastButtonExistsExsist() {
      await testSubjects.existOrFail(
        'mlSingleMetricViewerSeriesControls > mlSingleMetricViewerButtonForecast'
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

    async assertChartExsist() {
      await testSubjects.existOrFail('mlSingleMetricViewerChart');
    },
  };
}
