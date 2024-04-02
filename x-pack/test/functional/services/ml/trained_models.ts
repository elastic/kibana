/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { FtrProviderContext } from '../../ftr_provider_context';
import { MlCommonUI } from './common_ui';

export type TrainedModelsActions = ProvidedType<typeof TrainedModelsProvider>;

export type ModelType = 'lang_ident';

export interface MappedInputParams {
  lang_ident: LangIdentInput;
}

export interface MappedOutput {
  lang_ident: LangIdentOutput;
}

export function TrainedModelsProvider({ getService }: FtrProviderContext, mlCommonUI: MlCommonUI) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const browser = getService('browser');

  class TestModelFactory {
    public static createAssertionInstance(modelType: ModelType) {
      switch (modelType) {
        case 'lang_ident':
          return new TestLangIdentModel();
        default:
          throw new Error(`Testing class for ${modelType} is not implemented`);
      }
    }
  }

  class TestModelBase implements TestTrainedModel<BaseInput, unknown> {
    async setRequiredInput(input: BaseInput): Promise<void> {
      await testSubjects.setValue('mlTestModelInputText', input.inputText);
      await this.assertTestInputText(input.inputText);
    }

    async assertTestInputText(expectedText: string) {
      const actualValue = await testSubjects.getAttribute('mlTestModelInputText', 'value');
      expect(actualValue).to.eql(
        expectedText,
        `Expected input text to equal ${expectedText}, got ${actualValue}`
      );
    }

    assertModelOutput(expectedOutput: unknown): Promise<void> {
      throw new Error('assertModelOutput has to be implemented per model type');
    }
  }

  class TestLangIdentModel
    extends TestModelBase
    implements TestTrainedModel<LangIdentInput, LangIdentOutput>
  {
    async assertModelOutput(expectedOutput: LangIdentOutput) {
      const title = await testSubjects.getVisibleText('mlTestModelLangIdentTitle');
      expect(title).to.eql(expectedOutput.title);

      const values = await testSubjects.findAll('mlTestModelLangIdentInputValue');
      const topValue = await values[0].getVisibleText();
      expect(topValue).to.eql(expectedOutput.topLang.code);

      const probabilities = await testSubjects.findAll('mlTestModelLangIdentInputProbability');
      const topProbability = Number(await probabilities[0].getVisibleText());
      expect(topProbability).to.above(expectedOutput.topLang.minProbability);
    }
  }

  return {
    async assertStats(expectedTotalCount: number) {
      await retry.tryForTime(5 * 1000, async () => {
        const actualStats = await testSubjects.getVisibleText('mlInferenceModelsStatsBar');
        expect(actualStats).to.eql(`Total trained models: ${expectedTotalCount}`);
      });
    },

    async assertTableExists() {
      await testSubjects.existOrFail('~mlModelsTable');
    },

    async assertRowsNumberPerPage(rowsNumber: 10 | 25 | 100) {
      await mlCommonUI.assertRowsNumberPerPage('mlModelsTableContainer', rowsNumber);
    },

    async assertTestButtonEnabled(expectedValue: boolean = false) {
      const isEnabled = await testSubjects.isEnabled('mlTestModelTestButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected trained model "Test" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async testModel() {
      await testSubjects.click('mlTestModelTestButton');
    },

    async assertTestInputText(expectedText: string) {
      const actualValue = await testSubjects.getAttribute('mlTestModelInputText', 'value');
      expect(actualValue).to.eql(
        expectedText,
        `Expected input text to equal ${expectedText}, got ${actualValue}`
      );
    },

    async waitForResultsToLoad() {
      await testSubjects.waitForEnabled('mlTestModelTestButton');
      await retry.tryForTime(5000, async () => {
        await testSubjects.existOrFail(`mlTestModelOutput`);
      });
    },

    async testModelOutput(
      modelType: ModelType,
      inputParams: MappedInputParams[typeof modelType],
      expectedOutput: MappedOutput[typeof modelType]
    ) {
      await this.assertTestButtonEnabled(false);

      const modelTest = TestModelFactory.createAssertionInstance(modelType);
      await modelTest.setRequiredInput(inputParams);

      await this.assertTestButtonEnabled(true);
      await this.testModel();
      await this.waitForResultsToLoad();

      await modelTest.assertModelOutput(expectedOutput);

      await this.ensureTestFlyoutClosed();
    },

    async ensureTestFlyoutClosed() {
      await retry.tryForTime(5000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        await testSubjects.missingOrFail('mlTestModelsFlyout');
      });
    },

    async closeCheckingSpacePermissionsModal(): Promise<void> {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.click('mlDeleteSpaceAwareItemCheckModalOverlayCloseButton');
        await testSubjects.missingOrFail('mlDeleteSpaceAwareItemCheckModalOverlay');
      });
    },

    async selectModel(name: string): Promise<void> {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.click(`checkboxSelectRow-${name}`);
        await testSubjects.isChecked(`checkboxSelectRow-${name}`);
      });
    },

    async clickBulkDelete() {
      await retry.tryForTime(3_000, async () => {
        await testSubjects.click('mlTrainedModelsDeleteSelectedModelsButton');
        await testSubjects.existOrFail('mlDeleteSpaceAwareItemCheckModalOverlay');
      });
    },
  };
}

export interface BaseInput {
  inputText: string;
}

export type LangIdentInput = BaseInput;

export interface LangIdentOutput {
  title: string;
  topLang: { code: string; minProbability: number };
}

/**
 * Interface that needed to be implemented by all model types
 */
interface TestTrainedModel<Input extends BaseInput, Output> {
  setRequiredInput(input: Input): Promise<void>;
  assertTestInputText(inputText: Input['inputText']): Promise<void>;
  assertModelOutput(expectedOutput: Output): Promise<void>;
}
