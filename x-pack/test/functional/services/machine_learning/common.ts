/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ProvidedType } from '@kbn/test/types/ftr';

import { FtrProviderContext } from '../../ftr_provider_context';

interface SetValueOptions {
  clearWithKeyboard?: boolean;
  typeCharByChar?: boolean;
}

export type MlCommon = ProvidedType<typeof MachineLearningCommonProvider>;

export function MachineLearningCommonProvider({ getService }: FtrProviderContext) {
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
      });
    },

    async waitForMlLoadingIndicatorToDisappear() {
      await retry.tryForTime(10 * 1000, async () => {
        await testSubjects.missingOrFail('mlLoadingIndicator');
      });
    },
  };
}
