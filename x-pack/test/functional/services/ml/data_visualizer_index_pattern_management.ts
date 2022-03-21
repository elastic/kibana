/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlDataVisualizerTable } from './data_visualizer_table';

export function MachineLearningDataVisualizerIndexPatternManagementProvider(
  { getService }: FtrProviderContext,
  dataVisualizerTable: MlDataVisualizerTable
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const fieldEditor = getService('fieldEditor');
  const comboBox = getService('comboBox');

  return {
    async assertIndexPatternManagementButtonExists() {
      await testSubjects.existOrFail('dataVisualizerDataViewanagementButton');
    },
    async assertIndexPatternManagementMenuExists() {
      await testSubjects.existOrFail('dataVisualizerDataViewManagementMenu');
    },
    async assertIndexPatternFieldEditorExists() {
      await testSubjects.existOrFail('indexPatternFieldEditorForm');
    },

    async assertIndexPatternFieldEditorNotExist() {
      await testSubjects.missingOrFail('indexPatternFieldEditorForm');
    },

    async clickIndexPatternManagementButton() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.clickWhenNotDisabled('dataVisualizerDataViewManagementButton');
        await this.assertIndexPatternManagementMenuExists();
      });
    },
    async clickAddIndexPatternFieldAction() {
      await retry.tryForTime(5000, async () => {
        await this.assertIndexPatternManagementMenuExists();
        await testSubjects.clickWhenNotDisabled('dataVisualizerAddDataViewFieldAction');
        await this.assertIndexPatternFieldEditorExists();
      });
    },

    async clickManageIndexPatternAction() {
      await retry.tryForTime(5000, async () => {
        await this.assertIndexPatternManagementMenuExists();
        await testSubjects.clickWhenNotDisabled('dataVisualizerManageDataViewAction');
        await testSubjects.existOrFail('editIndexPattern');
      });
    },

    async assertIndexPatternFieldEditorFieldType(expectedIdentifier: string) {
      await retry.tryForTime(2000, async () => {
        const comboBoxSelectedOptions = await comboBox.getComboBoxSelectedOptions(
          'typeField > comboBoxInput'
        );
        expect(comboBoxSelectedOptions).to.eql(
          expectedIdentifier === '' ? [] : [expectedIdentifier],
          `Expected type field to be '${expectedIdentifier}' (got '${comboBoxSelectedOptions}')`
        );
      });
    },

    async setIndexPatternFieldEditorFieldType(type: string) {
      await comboBox.set('typeField > comboBoxInput', type);

      await this.assertIndexPatternFieldEditorFieldType(type);
    },

    async addRuntimeField(name: string, script: string, fieldType: string) {
      await retry.tryForTime(5000, async () => {
        await this.clickIndexPatternManagementButton();
        await this.clickAddIndexPatternFieldAction();

        await this.assertIndexPatternFieldEditorExists();
        await fieldEditor.setName(name);
        await fieldEditor.enableValue();
        await fieldEditor.typeScript(script);
        await this.setIndexPatternFieldEditorFieldType(fieldType);

        await fieldEditor.save();
        await this.assertIndexPatternFieldEditorNotExist();
      });
    },

    async renameField(originalName: string, newName: string) {
      await retry.tryForTime(5000, async () => {
        await dataVisualizerTable.clickEditIndexPatternFieldButton(originalName);
        await this.assertIndexPatternFieldEditorExists();
        await fieldEditor.enableCustomLabel();
        await fieldEditor.setCustomLabel(newName);
        await fieldEditor.save();
        await this.assertIndexPatternFieldEditorNotExist();
      });
    },

    async confirmDeleteField() {
      await testSubjects.existOrFail('deleteModalConfirmText');
      await testSubjects.setValue('deleteModalConfirmText', 'remove');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.missingOrFail('deleteModalConfirmText');
    },

    async deleteField(fieldName: string) {
      await retry.tryForTime(5000, async () => {
        await dataVisualizerTable.clickActionMenuDeleteIndexPatternFieldButton(fieldName);
        await this.confirmDeleteField();
        await dataVisualizerTable.assertRowNotExists(fieldName);
      });
    },
  };
}
