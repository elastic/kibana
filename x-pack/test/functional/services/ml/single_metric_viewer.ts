/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export function MachineLearningSingleMetricViewerProvider(
  { getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI
) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertSingleMetricViewerEmptyListMessageExsist() {
      await testSubjects.existOrFail('mlNoSingleMetricJobsFound');
    },

    async assertDetectorInputExist() {
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

    async assertEntityInputExist(entityFieldName: string) {
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

    async assertChartExist() {
      await testSubjects.existOrFail('mlSingleMetricViewerChart');
    },

    async assertAnnotationsExists(state: string) {
      await testSubjects.existOrFail(`mlAnomalyExplorerAnnotations ${state}`, {
        timeout: 30 * 1000,
      });
    },

    async openAnomalyExplorer() {
      await testSubjects.click('mlAnomalyResultsViewSelectorExplorer');
      await testSubjects.existOrFail('mlPageAnomalyExplorer');
    },

    async openConfigForControl(entityFieldName: string) {
      const isPopoverOpened = await testSubjects.exists(
        `mlSingleMetricViewerEntitySelectionConfigPopover_${entityFieldName}`
      );

      if (isPopoverOpened) {
        return;
      }

      await testSubjects.click(
        `mlSingleMetricViewerEntitySelectionConfigButton_${entityFieldName}`
      );
      await testSubjects.existOrFail(
        `mlSingleMetricViewerEntitySelectionConfigPopover_${entityFieldName}`
      );
    },

    async assertEntityConfig(
      entityFieldName: string,
      anomalousOnly: boolean,
      sortBy: 'anomaly_score' | 'name',
      order: 'asc' | 'desc'
    ) {
      await this.openConfigForControl(entityFieldName);
      expect(
        await testSubjects.isEuiSwitchChecked(
          `mlSingleMetricViewerEntitySelectionConfigAnomalousOnly_${entityFieldName}`
        )
      ).to.eql(
        anomalousOnly,
        `Expected the "Anomalous only" control for "${entityFieldName}" to be ${
          anomalousOnly ? 'enabled' : 'disabled'
        }`
      );
      await mlCommonUI.assertRadioGroupValue(
        `mlSingleMetricViewerEntitySelectionConfigSortBy_${entityFieldName}`,
        sortBy
      );
      await mlCommonUI.assertRadioGroupValue(
        `mlSingleMetricViewerEntitySelectionConfigOrder_${entityFieldName}`,
        order
      );
    },

    async setEntityConfig(
      entityFieldName: string,
      anomalousOnly: boolean,
      sortBy: 'anomaly_score' | 'name',
      order: 'asc' | 'desc'
    ) {
      await this.openConfigForControl(entityFieldName);
      await testSubjects.setEuiSwitch(
        `mlSingleMetricViewerEntitySelectionConfigAnomalousOnly_${entityFieldName}`,
        anomalousOnly ? 'check' : 'uncheck'
      );
      await mlCommonUI.selectRadioGroupValue(
        `mlSingleMetricViewerEntitySelectionConfigSortBy_${entityFieldName}`,
        sortBy
      );
      await mlCommonUI.selectRadioGroupValue(
        `mlSingleMetricViewerEntitySelectionConfigOrder_${entityFieldName}`,
        order
      );
      await this.assertEntityConfig(entityFieldName, anomalousOnly, sortBy, order);
    },

    async assertToastMessageExists(dataTestSubj: string) {
      const toast = await testSubjects.find(dataTestSubj);
      expect(toast).not.to.be(undefined);
    },
    async assertDisabledJobReasonWarningToastExist() {
      await this.assertToastMessageExists('mlTimeSeriesExplorerDisabledJobReasonWarningToast');
    },
  };
}
