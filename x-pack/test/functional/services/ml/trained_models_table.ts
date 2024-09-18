/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { upperFirst } from 'lodash';

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { MlCommonUI } from './common_ui';
import { MappedInputParams, MappedOutput, ModelType, TrainedModelsActions } from './trained_models';

export interface TrainedModelRowData {
  id: string;
  description: string;
  modelTypes: string[];
}

export type MlTrainedModelsTable = ProvidedType<typeof TrainedModelsTableProvider>;

export function TrainedModelsTableProvider(
  { getPageObject, getService }: FtrProviderContext,
  mlCommonUI: MlCommonUI,
  trainedModelsActions: TrainedModelsActions
) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const find = getService('find');
  const browser = getService('browser');
  const headerPage = getPageObject('header');

  return new (class ModelsTable {
    public async parseModelsTable() {
      const table = await testSubjects.find('~mlModelsTable');
      const $ = await table.parseDomContent();
      const rows = [];

      for (const tr of $.findTestSubjects('~mlModelsTableRow').toArray()) {
        const $tr = $(tr);

        const $types = $tr.findTestSubjects('mlModelType');
        const modelTypes = [];
        for (const el of $types.toArray()) {
          modelTypes.push($(el).text().trim());
        }

        const rowObject: {
          id: string;
          description: string;
          modelTypes: string[];
          createdAt: string;
          state: string;
        } = {
          id: $tr
            .findTestSubject('mlModelsTableColumnId')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          description: $tr
            .findTestSubject('mlModelsTableColumnDescription')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          modelTypes,
          state: $tr
            .findTestSubject('mlModelsTableColumnDeploymentState')
            .find('.euiTableCellContent')
            .text()
            .trim(),
          createdAt: $tr
            .findTestSubject('mlModelsTableColumnCreatedAt')
            .find('.euiTableCellContent')
            .text()
            .trim(),
        };

        rows.push(rowObject);
      }

      return rows;
    }

    public rowSelector(modelId: string, subSelector?: string) {
      const row = `~mlModelsTable > ~row-${modelId}`;
      return !subSelector ? row : `${row} > ${subSelector}`;
    }

    public async waitForRefreshButtonLoaded() {
      await testSubjects.existOrFail('~mlDatePickerRefreshPageButton', { timeout: 10 * 1000 });
      await testSubjects.existOrFail('mlDatePickerRefreshPageButton loaded', {
        timeout: 30 * 1000,
      });
    }

    public async refreshModelsTable() {
      await this.waitForRefreshButtonLoaded();
      await testSubjects.click('~mlDatePickerRefreshPageButton');
      await this.waitForRefreshButtonLoaded();
      await this.waitForModelsToLoad();
    }

    public async waitForModelsToLoad() {
      await testSubjects.existOrFail('~mlModelsTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail('mlModelsTable loaded', { timeout: 30 * 1000 });
    }

    async getModelsSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlModelsTableContainer');
      return await tableListContainer.findByClassName('euiFieldSearch');
    }

    public async assertModelsSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getModelsSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Trained models search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    }

    public async filterWithSearchString(filter: string, expectedRowCount: number = 1) {
      await this.waitForModelsToLoad();
      const searchBarInput = await this.getModelsSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertModelsSearchInputValue(filter);

      const rows = await this.parseModelsTable();
      const filteredRows = rows.filter((row) => row.id === filter);
      expect(filteredRows).to.have.length(
        expectedRowCount,
        `Filtered trained models table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredRows}')`
      );
    }

    public async assertModelDisplayedInTable(modelId: string, shouldBeDisplayed: boolean) {
      await retry.tryForTime(5 * 1000, async () => {
        await this.filterWithSearchString(modelId, shouldBeDisplayed === true ? 1 : 0);
      });
    }

    public async assertModelsRowFields(modelId: string, expectedRow: TrainedModelRowData) {
      await this.refreshModelsTable();
      const rows = await this.parseModelsTable();
      const modelRow = rows.filter((row) => row.id === modelId)[0];
      expect(modelRow.id).to.eql(
        expectedRow.id,
        `Expected trained model row ID to be '${expectedRow.id}' (got '${modelRow.id}')`
      );
      expect(modelRow.description).to.eql(
        expectedRow.description,
        `Expected trained model row description to be '${expectedRow.description}' (got '${modelRow.description}')`
      );
      expect(modelRow.modelTypes.sort()).to.eql(
        expectedRow.modelTypes.sort(),
        `Expected trained model row types to be '${JSON.stringify(
          expectedRow.modelTypes
        )}' (got '${JSON.stringify(modelRow.modelTypes)}')`
      );
      // 'Created at' will be different on each run,
      // so we will just assert that the value is in the expected timestamp format.
      expect(modelRow.createdAt).to.match(
        /^\w{3}\s\d+,\s\d{4}\s@\s\d{2}:\d{2}:\d{2}\.\d{3}$/,
        `Expected trained model row created at time to have same format as 'Dec 5, 2019 @ 12:28:34.594' (got '${modelRow.createdAt}')`
      );
    }

    public async assertTableIsPopulated() {
      await this.waitForModelsToLoad();
      const rows = await this.parseModelsTable();
      expect(rows.length).to.not.eql(0, `Expected trained model row count to be '>0' (got '0')`);
    }

    public async assertTableIsNotPopulated() {
      await this.waitForModelsToLoad();
      const rows = await this.parseModelsTable();
      expect(rows.length).to.eql(
        0,
        `Expected trained model row count to be '0' (got '${rows.length}')`
      );
    }

    public async assertModelCollapsedActionsButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await this.doesModelCollapsedActionsButtonExist(modelId);
      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row collapsed actions menu button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async doesModelCollapsedActionsButtonExist(modelId: string): Promise<boolean> {
      await headerPage.waitUntilLoadingHasFinished();
      return await testSubjects.exists(this.rowSelector(modelId, 'euiCollapsedItemActionsButton'));
    }

    public async toggleActionsContextMenu(modelId: string, expectOpen = true) {
      await testSubjects.click(this.rowSelector(modelId, 'euiCollapsedItemActionsButton'));

      await retry.tryForTime(5 * 1000, async () => {
        const panelElement = await find.byCssSelector('.euiContextMenuPanel');
        const isDisplayed = await panelElement.isDisplayed();
        expect(isDisplayed).to.eql(
          expectOpen,
          `Expected the action context menu for '${modelId}' to be ${
            expectOpen ? 'open' : 'closed'
          }`
        );
      });
    }

    public async assertModelDeleteActionButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await testSubjects.exists(
        this.rowSelector(modelId, 'mlModelsTableRowDeleteAction')
      );
      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row delete action button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async assertModelDeployActionButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await testSubjects.exists(
        this.rowSelector(modelId, 'mlModelsTableRowDeployAction')
      );

      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row deploy action button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async assertModelAnalyzeDataDriftButtonExists(modelId: string, expectedValue: boolean) {
      const actionsExists = await testSubjects.exists(
        this.rowSelector(modelId, 'mlModelsAnalyzeDataDriftAction')
      );

      expect(actionsExists).to.eql(
        expectedValue,
        `Expected row analyze data drift action button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionsExists ? 'visible' : 'hidden'})`
      );
    }

    public async assertAnalyzeDataDriftActionButtonEnabled(
      modelId: string,
      expectedValue: boolean
    ) {
      const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);

      let isEnabled = null;
      await retry.tryForTime(5 * 1000, async () => {
        if (actionsButtonExists) {
          await this.toggleActionsContextMenu(modelId, true);
          const panelElement = await find.byCssSelector('.euiContextMenuPanel');
          const actionButton = await panelElement.findByTestSubject('mlModelsTableRowDeleteAction');
          isEnabled = await actionButton.isEnabled();
          // escape popover
          await browser.pressKeys(browser.keys.ESCAPE);
        } else {
          await this.assertModelDeleteActionButtonExists(modelId, true);
          isEnabled = await testSubjects.isEnabled(
            this.rowSelector(modelId, 'mlModelsAnalyzeDataDriftAction')
          );
        }

        expect(isEnabled).to.eql(
          expectedValue,
          `Expected row analyze data drift action button for trained model '${modelId}' to be '${
            expectedValue ? 'enabled' : 'disabled'
          }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
        );
      });
    }

    public async clickAnalyzeDataDriftActionButton(modelId: string) {
      await retry.tryForTime(30 * 1000, async () => {
        const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);
        if (actionsButtonExists) {
          await this.toggleActionsContextMenu(modelId, true);
          const panelElement = await find.byCssSelector('.euiContextMenuPanel');
          const actionButton = await panelElement.findByTestSubject(
            'mlModelsAnalyzeDataDriftAction'
          );
          await actionButton.click();
          // escape popover
          await browser.pressKeys(browser.keys.ESCAPE);
        } else {
          await this.assertModelDeleteActionButtonExists(modelId, true);
          await testSubjects.click(this.rowSelector(modelId, 'mlModelsAnalyzeDataDriftAction'));
        }

        await testSubjects.existOrFail('mlPageDataDriftCustomIndexPatterns');
      });
    }

    public async assertModelTestButtonExists(modelId: string, expectedValue: boolean) {
      const actionExists = await testSubjects.exists(
        this.rowSelector(modelId, 'mlModelsTableRowTestAction')
      );
      expect(actionExists).to.eql(
        expectedValue,
        `Expected test action button for trained model '${modelId}' to be ${
          expectedValue ? 'visible' : 'hidden'
        } (got ${actionExists ? 'visible' : 'hidden'})`
      );
    }

    public async testModel(
      modelType: ModelType,
      modelId: string,
      inputParams: MappedInputParams[typeof modelType],
      expectedResult: MappedOutput[typeof modelType]
    ) {
      await mlCommonUI.invokeTableRowAction(
        this.rowSelector(modelId),
        'mlModelsTableRowTestAction',
        false
      );
      await this.assertTestFlyoutExists();

      await trainedModelsActions.testModelOutput(modelType, inputParams, expectedResult);
    }

    public async deleteModel(modelId: string) {
      const fromContextMenu = await this.doesModelCollapsedActionsButtonExist(modelId);
      await mlCommonUI.invokeTableRowAction(
        this.rowSelector(modelId),
        'mlModelsTableRowDeleteAction',
        fromContextMenu
      );
      await this.assertDeleteModalExists();
      await this.confirmDeleteModel();
      await mlCommonUI.waitForRefreshButtonEnabled();
      await this.assertModelDisplayedInTable(modelId, false);
    }

    public async assertModelDeployActionButtonEnabled(modelId: string, expectedValue: boolean) {
      const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);

      let isEnabled = null;

      if (actionsButtonExists) {
        await this.toggleActionsContextMenu(modelId, true);
        const panelElement = await find.byCssSelector('.euiContextMenuPanel');
        const actionButton = await panelElement.findByTestSubject('mlModelsTableRowDeployAction');
        isEnabled = await actionButton.isEnabled();
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);
      } else {
        await this.assertModelDeployActionButtonExists(modelId, true);
        isEnabled = await testSubjects.isEnabled(
          this.rowSelector(modelId, 'mlModelsTableRowDeployAction')
        );
      }

      expect(isEnabled).to.eql(
        expectedValue,
        `Expected row deploy action button for trained model '${modelId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async assertModelDeleteActionButtonEnabled(modelId: string, expectedValue: boolean) {
      const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);

      let isEnabled = null;

      if (actionsButtonExists) {
        await this.toggleActionsContextMenu(modelId, true);
        const panelElement = await find.byCssSelector('.euiContextMenuPanel');
        const actionButton = await panelElement.findByTestSubject('mlModelsTableRowDeleteAction');
        isEnabled = await actionButton.isEnabled();
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);
      } else {
        await this.assertModelDeleteActionButtonExists(modelId, true);
        isEnabled = await testSubjects.isEnabled(
          this.rowSelector(modelId, 'mlModelsTableRowDeleteAction')
        );
      }

      expect(isEnabled).to.eql(
        expectedValue,
        `Expected row delete action button for trained model '${modelId}' to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    }

    public async deployModelsContinue(expectedStep?: string) {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineContinueButton');
      await testSubjects.click('mlTrainedModelsInferencePipelineContinueButton');
      if (expectedStep) {
        await testSubjects.existOrFail(expectedStep);
      }
    }

    public async assertDeployModelsCreateButton(expectedStep?: string) {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineCreateButton');
      await testSubjects.click('mlTrainedModelsInferencePipelineCreateButton');
    }

    public async assertDeleteModalExists() {
      await testSubjects.existOrFail('mlModelsDeleteModal', { timeout: 60 * 1000 });
    }

    public async assertTestFlyoutExists() {
      await testSubjects.existOrFail('mlTestModelsFlyout', { timeout: 60 * 1000 });
    }

    public async assertDeployModelFlyoutExists() {
      await testSubjects.existOrFail('mlTrainedModelsInferencePipelineFlyout', {
        timeout: 60 * 1000,
      });
    }

    public async assertStartDeploymentModalExists(expectExist = true) {
      if (expectExist) {
        await testSubjects.existOrFail('mlModelsStartDeploymentModal', { timeout: 60 * 1000 });
      } else {
        await testSubjects.missingOrFail('mlModelsStartDeploymentModal', { timeout: 60 * 1000 });
      }
    }

    public async assertDeleteModalNotExists() {
      await testSubjects.missingOrFail('mlModelsDeleteModal', { timeout: 60 * 1000 });
    }

    public async getCheckBoxState(testSubj: string): Promise<boolean> {
      return (await testSubjects.getAttribute(testSubj, 'checked')) === 'true';
    }

    public async assertDeletePipelinesCheckboxSelected(expectedValue: boolean) {
      const actualCheckState = await this.getCheckBoxState(
        'mlModelsDeleteModalDeletePipelinesCheckbox'
      );
      expect(actualCheckState).to.eql(
        expectedValue,
        `Delete model pipelines checkbox should be ${expectedValue} (got ${actualCheckState})`
      );
    }

    public async setDeletePipelinesCheckbox() {
      await this.assertDeletePipelinesCheckboxSelected(false);

      const checkboxLabel = await find.byCssSelector(`label[for="delete-model-pipelines"]`);
      await checkboxLabel.click();

      await this.assertDeletePipelinesCheckboxSelected(true);
    }

    public async confirmDeleteModel(withPipelines: boolean = false) {
      await retry.tryForTime(30 * 1000, async () => {
        await this.assertDeleteModalExists();

        if (withPipelines) {
          await this.setDeletePipelinesCheckbox();
        }

        await testSubjects.click('mlModelsDeleteModalConfirmButton');
        await this.assertDeleteModalNotExists();
      });
    }

    public async clickDeleteAction(modelId: string) {
      const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);

      if (actionsButtonExists) {
        await this.toggleActionsContextMenu(modelId, true);
        const panelElement = await find.byCssSelector('.euiContextMenuPanel');
        const actionButton = await panelElement.findByTestSubject('mlModelsTableRowDeleteAction');
        await actionButton.click();
      } else {
        await testSubjects.click(this.rowSelector(modelId, 'mlModelsTableRowDeleteAction'));
      }

      await this.assertDeleteModalExists();
    }

    public async clickDeployAction(modelId: string) {
      const actionsButtonExists = await this.doesModelCollapsedActionsButtonExist(modelId);

      if (actionsButtonExists) {
        await this.toggleActionsContextMenu(modelId, true);
        const panelElement = await find.byCssSelector('.euiContextMenuPanel');
        const actionButton = await panelElement.findByTestSubject('mlModelsTableRowDeployAction');
        await actionButton.click();
      } else {
        await testSubjects.click(this.rowSelector(modelId, 'mlModelsTableRowDeployAction'));
      }

      await this.assertDeployModelFlyoutExists();
    }

    async assertOptimizedFor(expectedValue: 'optimizedForIngest' | 'optimizedForSearch') {
      const element = await testSubjects.find(
        `mlModelsStartDeploymentModalOptimized_${expectedValue}`
      );
      const inputElement = await element.findByTagName('input');
      const isChecked = await inputElement.getAttribute('checked');

      expect(isChecked).to.eql(
        'true',
        `Expected optimized for ${expectedValue} to be selected, got ${isChecked}`
      );
    }

    public async setOptimizedFor(optimized: 'optimizedForIngest' | 'optimizedForSearch') {
      const element = await testSubjects.find(`mlModelsStartDeploymentModalOptimized_${optimized}`);
      await element.click();
      await this.assertOptimizedFor(optimized);
    }

    public async setVCPULevel(value: 'low' | 'medium' | 'high') {
      const valuesMap = {
        low: 0.5,
        medium: 1.5,
        high: 2.5,
      };
      await mlCommonUI.setSliderValue('mlModelsStartDeploymentModalVCPULevel', valuesMap[value]);
      await mlCommonUI.assertSliderValue('mlModelsStartDeploymentModalVCPULevel', valuesMap[value]);
    }

    public async assertAdvancedConfigurationOpen(expectedValue: boolean) {
      const panelElement = await testSubjects.find(
        'mlModelsStartDeploymentModalAdvancedConfiguration'
      );
      const isOpen = await panelElement.elementHasClass('euiPanel-isOpen');

      expect(isOpen).to.eql(
        expectedValue,
        `Expected Advanced configuration to be ${expectedValue ? 'open' : 'closed'}`
      );
    }

    public async toggleAdvancedConfiguration(open: boolean) {
      const panelElement = await testSubjects.find(
        'mlModelsStartDeploymentModalAdvancedConfiguration'
      );
      const toggleButton = await panelElement.findByTagName('button');
      await toggleButton.click();
      await this.assertAdvancedConfigurationOpen(open);
    }

    public async startDeploymentWithParams(
      modelId: string,
      params: {
        optimized: 'optimizedForIngest' | 'optimizedForSearch';
        vCPULevel?: 'low' | 'medium' | 'high';
        adaptiveResources?: boolean;
      }
    ) {
      await this.openStartDeploymentModal(modelId);

      await this.setOptimizedFor(params.optimized);

      const hasAdvancedConfiguration =
        params.vCPULevel !== undefined || params.adaptiveResources !== undefined;

      if (hasAdvancedConfiguration) {
        await this.toggleAdvancedConfiguration(true);
      }

      if (params.vCPULevel) {
        await this.setVCPULevel(params.vCPULevel);
      }

      await testSubjects.click('mlModelsStartDeploymentModalStartButton');
      await this.assertStartDeploymentModalExists(false);

      await mlCommonUI.waitForRefreshButtonEnabled();

      await mlCommonUI.assertLastToastHeader(
        `Deployment for "${modelId}" has been started successfully.`
      );
      await this.waitForModelsToLoad();

      await retry.tryForTime(
        5 * 1000,
        async () => {
          await this.assertModelState(modelId, 'Deployed');
        },
        async () => {
          await this.refreshModelsTable();
        }
      );
    }

    public async assertModelState(modelId: string, expectedValue = 'Deployed') {
      const rows = await this.parseModelsTable();
      const modelRow = rows.find((row) => row.id === modelId);
      expect(modelRow?.state).to.eql(
        expectedValue,
        `Expected trained model row state to be '${expectedValue}' (got '${modelRow?.state!}')`
      );
    }

    public async stopDeployment(modelId: string) {
      await this.clickStopDeploymentAction(modelId);
      await mlCommonUI.waitForRefreshButtonEnabled();
      await mlCommonUI.assertLastToastHeader(
        `Deployment for "${modelId}" has been stopped successfully.`
      );
      await mlCommonUI.waitForRefreshButtonEnabled();
    }

    public async openStartDeploymentModal(modelId: string) {
      await testSubjects.clickWhenNotDisabled(
        this.rowSelector(modelId, 'mlModelsTableRowStartDeploymentAction'),
        { timeout: 5000 }
      );
      await this.assertStartDeploymentModalExists(true);
    }

    public async clickStopDeploymentAction(modelId: string) {
      await mlCommonUI.invokeTableRowAction(
        this.rowSelector(modelId),
        'mlModelsTableRowStopDeploymentAction',
        true
      );
    }

    public async ensureRowIsExpanded(modelId: string) {
      await this.filterWithSearchString(modelId);
      await retry.tryForTime(10 * 1000, async () => {
        if (!(await testSubjects.exists('mlTrainedModelRowDetails'))) {
          await testSubjects.click(`${this.rowSelector(modelId)} > mlModelsTableRowDetailsToggle`);
          await testSubjects.existOrFail('mlTrainedModelRowDetails', { timeout: 1000 });
        }
      });
      await mlCommonUI.waitForRefreshButtonEnabled();
    }

    public async assertTabContent(
      type: 'details' | 'stats' | 'inferenceConfig' | 'pipelines' | 'map',
      expectVisible = true
    ) {
      const tabTestSubj = `mlTrainedModel${upperFirst(type)}`;
      const tabContentTestSubj = `mlTrainedModel${upperFirst(type)}Content`;

      if (!expectVisible) {
        await testSubjects.missingOrFail(tabTestSubj);
        return;
      }

      await testSubjects.existOrFail(tabTestSubj);
      await testSubjects.click(tabTestSubj);
      await testSubjects.existOrFail(tabContentTestSubj);
    }

    public async assertDetailsTabContent(expectVisible = true) {
      await this.assertTabContent('details', expectVisible);
    }

    public async assertModelsMapTabContent(expectVisible = true) {
      await this.assertTabContent('map', expectVisible);
    }

    public async assertInferenceConfigTabContent(expectVisible = true) {
      await this.assertTabContent('inferenceConfig', expectVisible);
    }

    public async assertStatsTabContent(expectVisible = true) {
      await this.assertTabContent('stats', expectVisible);
    }

    public async assertPipelinesTabContent(
      expectVisible = true,
      pipelinesExpectOptions?: Array<{ pipelineName: string; expectDefinition: boolean }>
    ) {
      await this.assertTabContent('pipelines', expectVisible);

      if (Array.isArray(pipelinesExpectOptions)) {
        for (const p of pipelinesExpectOptions) {
          if (p.expectDefinition) {
            await testSubjects.existOrFail(`mlTrainedModelPipelineEditButton_${p.pipelineName}`);
            await testSubjects.existOrFail(`mlTrainedModelPipelineDefinition_${p.pipelineName}`);
          } else {
            await testSubjects.missingOrFail(`mlTrainedModelPipelineEditButton_${p.pipelineName}`);
            await testSubjects.missingOrFail(`mlTrainedModelPipelineDefinition_${p.pipelineName}`);
          }
        }
      }
    }

    public async clickAnalyzeDataDriftWithoutSaving() {
      await retry.tryForTime(5 * 1000, async () => {
        await testSubjects.clickWhenNotDisabled('analyzeDataDriftWithoutSavingButton');
        await testSubjects.existOrFail('mlDataDriftTable');
      });
    }

    public async assertSpaceAwareWarningMessage(): Promise<void> {
      await testSubjects.existOrFail('mlDeleteSpaceAwareItemCheckModalOverlay', {
        timeout: 3_000,
      });
    }
  })();
}
