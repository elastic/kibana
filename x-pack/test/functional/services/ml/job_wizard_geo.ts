/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningJobWizardGeoProvider({ getService }: FtrProviderContext) {
  const comboBox = getService('comboBox');
  const testSubjects = getService('testSubjects');

  return {
    async assertGeoFieldInputExists() {
      await testSubjects.existOrFail('mlGeoFieldNameSelect > comboBoxInput');
    },

    async assertGeoFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlGeoFieldNameSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected geo field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectGeoField(identifier: string) {
      await comboBox.set('mlGeoFieldNameSelect > comboBoxInput', identifier);
      await this.assertGeoFieldSelection([identifier]);
    },

    async assertSplitFieldInputExists() {
      await testSubjects.existOrFail('mlSplitFieldSelect > comboBoxInput');
    },

    async assertSplitFieldSelection(expectedIdentifier: string[]) {
      const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
        'mlSplitFieldSelect > comboBoxInput'
      );
      expect(comboBoxSelectedOptions).to.eql(
        expectedIdentifier,
        `Expected split field selection to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
      );
    },

    async selectSplitField(identifier: string) {
      await comboBox.set('mlSplitFieldSelect > comboBoxInput', identifier);
      await this.assertSplitFieldSelection([identifier]);
    },

    async assertSplitCardWithMapExampleExists() {
      await testSubjects.existOrFail('mlGeoJobWizardMap');
    },

    async assertDetectorPreviewExists(detectorDescription: string) {
      await testSubjects.existOrFail('mlGeoMap > mlDetectorTitle');
      const actualDetectorTitle = await testSubjects.getVisibleText('mlGeoMap > mlDetectorTitle');
      expect(actualDetectorTitle).to.eql(
        detectorDescription,
        `Expected detector title to be '${detectorDescription}' (got '${actualDetectorTitle}')`
      );

      await testSubjects.existOrFail('mlGeoJobWizardMap');
      await testSubjects.existOrFail('mlEmbeddedMapContent');
    },

    async assertDetectorSplitExists(splitField: string) {
      await testSubjects.existOrFail(`mlDataSplit > mlDataSplitTitle ${splitField}`);
      await testSubjects.existOrFail('mlDataSplit > mlSplitCard front');
    },

    async assertDetectorSplitFrontCardTitle(expectedFrontCardTitle: string) {
      const actualFrontCardTitle = await testSubjects.getVisibleText(
        'mlDataSplit > mlSplitCard front > mlSplitCardTitle'
      );
      expect(actualFrontCardTitle).to.eql(
        expectedFrontCardTitle,
        `Expected front card title to be '${expectedFrontCardTitle}' (got '${actualFrontCardTitle}')`
      );
    },

    async assertDetectorSplitNumberOfBackCards(expectedNumberOfBackCards: number) {
      const allBackCards = await testSubjects.findAll('mlDataSplit > mlSplitCard back');
      expect(allBackCards).to.have.length(
        expectedNumberOfBackCards,
        `Expected number of back cards to be '${expectedNumberOfBackCards}' (got '${allBackCards.length}')`
      );
    },
  };
}
