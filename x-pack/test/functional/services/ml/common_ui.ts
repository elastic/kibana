/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test/types/ftr';

import { FtrProviderContext } from '../../ftr_provider_context';

interface SetValueOptions {
  clearWithKeyboard?: boolean;
  typeCharByChar?: boolean;
}

export type MlCommonUI = ProvidedType<typeof MachineLearningCommonUIProvider>;

export function MachineLearningCommonUIProvider({ getService }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');

  return {
    async setValueWithChecks(
      selector: string,
      text: string,
      options: SetValueOptions = {}
    ): Promise<void> {
      return await retry.try(async () => {
        const { clearWithKeyboard = false, typeCharByChar = false } = options;
        log.debug(`TestSubjects.setValueWithChecks(${selector}, ${text})`);
        await testSubjects.click(selector);
        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await find.activeElement();

        // make sure that clearing the element's value works
        await retry.tryForTime(5000, async () => {
          let currentValue = await input.getAttribute('value');
          if (currentValue !== '') {
            if (clearWithKeyboard === true) {
              await input.clearValueWithKeyboard();
            } else {
              await input.clearValue();
            }
            currentValue = await input.getAttribute('value');
          }

          if (currentValue === '') {
            return true;
          } else {
            throw new Error(`Expected input to be empty, but got value '${currentValue}'`);
          }
        });

        // make sure that typing a character really adds that character to the input value
        for (const chr of text) {
          await retry.tryForTime(5000, async () => {
            const oldValue = await input.getAttribute('value');
            await input.type(chr, { charByChar: typeCharByChar });

            await retry.tryForTime(1000, async () => {
              const newValue = await input.getAttribute('value');
              if (newValue === `${oldValue}${chr}`) {
                return true;
              } else {
                throw new Error(
                  `After typing character '${chr}', the new value in the input should be '${oldValue}${chr}' (got ${newValue})`
                );
              }
            });
          });
        }

        // make sure that finally the complete text is entered
        // this is needed because sometimes the field value is reset while typing
        // and the above character checking might not catch it due to bad timing
        const currentValue = await input.getAttribute('value');
        if (currentValue !== text) {
          throw new Error(
            `Expected input '${selector}' to have the value '${text}' (got ${currentValue})`
          );
        }
      });
    },

    async waitForMlLoadingIndicatorToDisappear() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlLoadingIndicator');
      });
    },

    async assertKibanaHomeFileDataVisLinkExists() {
      await testSubjects.existOrFail('homeSynopsisLinkml_file_data_visualizer');
    },

    async assertKibanaHomeFileDataVisLinkNotExists() {
      await testSubjects.missingOrFail('homeSynopsisLinkml_file_data_visualizer');
    },

    async assertRadioGroupValue(testSubject: string, expectedValue: string) {
      const assertRadioGroupValue = await testSubjects.find(testSubject);
      const input = await assertRadioGroupValue.findByCssSelector(':checked');
      const selectedOptionId = await input.getAttribute('id');
      expect(selectedOptionId).to.eql(
        expectedValue,
        `Expected the radio group value to equal "${expectedValue}" (got "${selectedOptionId}")`
      );
    },

    async selectRadioGroupValue(testSubject: string, value: string) {
      const radioGroup = await testSubjects.find(testSubject);
      const label = await radioGroup.findByCssSelector(`label[for="${value}"]`);
      await label.click();
      await this.assertRadioGroupValue(testSubject, value);
    },
  };
}
