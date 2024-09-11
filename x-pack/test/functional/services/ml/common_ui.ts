/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ProvidedType } from '@kbn/test';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';

import type { CanvasElementColorStats } from '../canvas_element';

export interface SetValueOptions {
  clearWithKeyboard?: boolean;
  enforceDataTestSubj?: boolean;
  typeCharByChar?: boolean;
}

export type MlCommonUI = ProvidedType<typeof MachineLearningCommonUIProvider>;

export function MachineLearningCommonUIProvider({
  getPageObjects,
  getService,
}: FtrProviderContext) {
  const PageObjects = getPageObjects(['spaceSelector']);

  const canvasElement = getService('canvasElement');
  const log = getService('log');
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');
  const toasts = getService('toasts');

  return {
    async setValueWithChecks(
      selector: string,
      text: string,
      options: SetValueOptions = {}
    ): Promise<void> {
      return await retry.try(async () => {
        const {
          clearWithKeyboard = false,
          enforceDataTestSubj = false,
          typeCharByChar = false,
        } = options;
        log.debug(`TestSubjects.setValueWithChecks(${selector}, ${text})`);
        await testSubjects.click(selector);

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        let input: WebElementWrapper;
        if (enforceDataTestSubj) {
          await retry.tryForTime(5000, async () => {
            await testSubjects.click(selector);
            input = await find.activeElement();
            const currentDataTestSubj = await input.getAttribute('data-test-subj');
            if (currentDataTestSubj === selector) {
              return true;
            } else {
              throw new Error(
                `Expected input data-test-subj to be ${selector}, but got value '${currentDataTestSubj}'`
              );
            }
          });
        } else {
          await testSubjects.click(selector);
          input = await find.activeElement();
        }

        // make sure that clearing the element's value works
        await retry.tryForTime(5000, async () => {
          let currentValue = await testSubjects.getAttribute(selector, 'value');
          if (currentValue !== '') {
            if (clearWithKeyboard === true) {
              await input.clearValueWithKeyboard();
            } else {
              await input.clearValue();
            }
            currentValue = await testSubjects.getAttribute(selector, 'value');
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
            const oldValue = await testSubjects.getAttribute(selector, 'value');
            await input.type(chr, { charByChar: typeCharByChar });

            await retry.tryForTime(1000, async () => {
              const newValue = await testSubjects.getAttribute(selector, 'value');
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
        const currentValue = await testSubjects.getAttribute(selector, 'value');
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

    async assertSelectSelectedOptionVisibleText(testSubject: string, visibleText: string) {
      // Need to validate the selected option text, as the option value may be different to the visible text.
      const selectControl = await testSubjects.find(testSubject);
      const selectedValue = await selectControl.getAttribute('value');
      const selectedOption = await selectControl.findByCssSelector(`[value="${selectedValue}"]`);
      const selectedOptionText = await selectedOption.getVisibleText();
      expect(selectedOptionText).to.eql(
        visibleText,
        `Expected selected option visible text to be '${visibleText}' (got '${selectedOptionText}')`
      );
    },

    async selectSelectValueByVisibleText(testSubject: string, visibleText: string) {
      // Cannot use await testSubjects.selectValue as the option value may be different to the text.
      const selectControl = await testSubjects.find(testSubject);
      await selectControl.type(visibleText);
      await this.assertSelectSelectedOptionVisibleText(testSubject, visibleText);
    },

    async setMultiSelectFilter(testDataSubj: string, fieldTypes: string[]) {
      await retry.tryForTime(60 * 1000, async () => {
        // escape popover
        await browser.pressKeys(browser.keys.ESCAPE);

        await testSubjects.clickWhenNotDisabledWithoutRetry(`${testDataSubj}-button`);
        await testSubjects.existOrFail(`${testDataSubj}-popover`);
        await testSubjects.existOrFail(`${testDataSubj}-searchInput`);
        const searchBarInput = await testSubjects.find(`${testDataSubj}-searchInput`);

        for (const fieldType of fieldTypes) {
          await retry.tryForTime(5000, async () => {
            await searchBarInput.clearValueWithKeyboard();
            await searchBarInput.type(fieldType);
            if (!(await testSubjects.exists(`${testDataSubj}-option-${fieldType}-checked`))) {
              await testSubjects.existOrFail(`${testDataSubj}-option-${fieldType}`);
              await testSubjects.click(`${testDataSubj}-option-${fieldType}`);
              await testSubjects.existOrFail(`${testDataSubj}-option-${fieldType}-checked`);
            }
          });
        }
      });

      // escape popover
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async removeMultiSelectFilter(testDataSubj: string, fieldTypes: string[]) {
      await testSubjects.clickWhenNotDisabledWithoutRetry(`${testDataSubj}-button`);
      await testSubjects.existOrFail(`${testDataSubj}-popover`);
      await testSubjects.existOrFail(`${testDataSubj}-searchInput`);
      const searchBarInput = await testSubjects.find(`${testDataSubj}-searchInput`);

      for (const fieldType of fieldTypes) {
        await retry.tryForTime(5000, async () => {
          await searchBarInput.clearValueWithKeyboard();
          await searchBarInput.type(fieldType);
          if (!(await testSubjects.exists(`${testDataSubj}-option-${fieldType}`))) {
            await testSubjects.existOrFail(`${testDataSubj}-option-${fieldType}-checked`);
            await testSubjects.click(`${testDataSubj}-option-${fieldType}-checked`);
            await testSubjects.existOrFail(`${testDataSubj}-option-${fieldType}`);
          }
        });
      }

      // escape popover
      await browser.pressKeys(browser.keys.ESCAPE);
    },

    async setSliderValue(testDataSubj: string, value: number) {
      const slider = await testSubjects.find(testDataSubj);

      await retry.tryForTime(60 * 1000, async () => {
        const currentValue = (await slider.getAttribute('value')) ?? '';
        const currentDiff = +currentValue - +value;

        if (currentDiff === 0) {
          return true;
        } else {
          if (currentDiff > 0) {
            if (Math.abs(currentDiff) >= 10) {
              await slider.type(browser.keys.PAGE_DOWN);
            } else {
              await slider.type(browser.keys.ARROW_LEFT);
            }
          } else {
            if (Math.abs(currentDiff) >= 10) {
              await slider.type(browser.keys.PAGE_UP);
            } else {
              await slider.type(browser.keys.ARROW_RIGHT);
            }
          }
          await retry.tryForTime(1000, async () => {
            const newValue = await slider.getAttribute('value');
            if (newValue === currentValue) {
              throw new Error(`slider value should have changed, but is still ${currentValue}`);
            }
          });
          await this.assertSliderValue(testDataSubj, value);
        }
      });
    },

    async assertSliderValue(testDataSubj: string, expectedValue: number) {
      const actualValue = await testSubjects.getAttribute(testDataSubj, 'value');
      expect(actualValue).to.eql(
        expectedValue,
        `${testDataSubj} slider value should be '${expectedValue}' (got '${actualValue}')`
      );
    },

    async disableAntiAliasing() {
      await canvasElement.disableAntiAliasing();
    },

    async resetAntiAliasing() {
      await canvasElement.resetAntiAliasing();
    },

    async assertColorsInCanvasElement(
      dataTestSubj: string,
      expectedColorStats: CanvasElementColorStats,
      exclude?: string[],
      percentageThreshold = 0,
      channelTolerance = 10,
      valueTolerance = 10
    ) {
      if (process.env.TEST_CLOUD) {
        log.warning('Not running color assertions in cloud');
        return;
      }

      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.existOrFail(dataTestSubj);

        const actualColorStatsWithTolerance = await canvasElement.getColorStatsWithColorTolerance(
          `[data-test-subj="${dataTestSubj}"] canvas`,
          expectedColorStats,
          exclude,
          percentageThreshold,
          channelTolerance,
          valueTolerance
        );

        expect(actualColorStatsWithTolerance.every((d) => d.withinTolerance)).to.eql(
          true,
          `Color stats for '${dataTestSubj}' should be within tolerance. Expected: '${JSON.stringify(
            expectedColorStats
          )}' (got '${JSON.stringify(actualColorStatsWithTolerance)}')`
        );
      });
    },

    async assertRowsNumberPerPage(testSubj: string, rowsNumber: 10 | 25 | 100) {
      const textContent = await testSubjects.getVisibleText(
        `${testSubj} > tablePaginationPopoverButton`
      );
      expect(textContent).to.be(`Rows per page: ${rowsNumber}`);
    },

    async ensurePagePopupOpen(testSubj: string) {
      await retry.tryForTime(5000, async () => {
        const isOpen = await testSubjects.exists('tablePagination-10-rows');
        if (!isOpen) {
          await testSubjects.click(`${testSubj} > tablePaginationPopoverButton`);
          await testSubjects.existOrFail('tablePagination-10-rows');
        }
      });
    },

    async setRowsNumberPerPage(testSubj: string, rowsNumber: 10 | 25 | 100) {
      await this.ensurePagePopupOpen(testSubj);
      await testSubjects.click(`tablePagination-${rowsNumber}-rows`);
      await this.assertRowsNumberPerPage(testSubj, rowsNumber);
    },

    async getEuiDescriptionListDescriptionFromTitle(testSubj: string, title: string) {
      const subj = await testSubjects.find(testSubj);
      const titles = await subj.findAllByTagName('dt');
      const descriptions = await subj.findAllByTagName('dd');

      for (let i = 0; i < titles.length; i++) {
        const titleText = (await titles[i].parseDomContent()).html();
        if (titleText === title) {
          return (await descriptions[i].parseDomContent()).html();
        }
      }
      return null;
    },

    async changeToSpace(spaceId: string) {
      await PageObjects.spaceSelector.openSpacesNav();
      await PageObjects.spaceSelector.goToSpecificSpace(spaceId);
      await PageObjects.spaceSelector.expectSpace(spaceId);
    },

    async waitForDatePickerIndicatorLoaded() {
      await testSubjects.waitForEnabled('superDatePickerApplyTimeButton');
    },

    async waitForRefreshButtonEnabled() {
      await testSubjects.waitForEnabled('~mlDatePickerRefreshPageButton');
    },

    async assertOneOfExists(subjectsToCheck: string[], timeout: number = 0) {
      const singleSubjectTimeout = 500;
      // make sure that the overall timeout is not too short
      const overallTimeout = Math.max(timeout, subjectsToCheck.length * singleSubjectTimeout * 5);

      await retry.tryForTime(overallTimeout, async () => {
        for (const testSubj of subjectsToCheck) {
          const subjExists = await testSubjects.exists(testSubj, { timeout: singleSubjectTimeout });
          if (subjExists) return; // stop ckecking once we found an existing element
        }
        throw new Error(
          `Expected one element of the following list to exist: ${JSON.stringify(subjectsToCheck)}`
        );
      });
    },

    async selectButtonGroupValue(inputTestSubj: string, value: string, valueTestSubj?: string) {
      await retry.tryForTime(5000, async () => {
        // The input element can not be clicked directly.
        // Instead, we need to click the corresponding label

        let labelElement: WebElementWrapper;

        if (valueTestSubj) {
          await testSubjects.click(valueTestSubj);
          labelElement = await testSubjects.find(valueTestSubj);
        } else {
          const fieldSetElement = await testSubjects.find(inputTestSubj);
          labelElement = await fieldSetElement.findByCssSelector(`label[title="${value}"]`);
          await labelElement.click();
        }

        const labelClasses = await labelElement.getAttribute('class');
        expect(labelClasses).to.contain(
          'euiButtonGroupButton-isSelected',
          `Label for '${inputTestSubj}' should be selected`
        );
      });
    },

    async assertLastToastHeader(expectedHeader: string, timeout: number = 5000) {
      await retry.tryForTime(timeout, async () => {
        const title: string = await toasts.getTitleByIndex(1);
        expect(title).to.eql(
          expectedHeader,
          `Expected the toast header to equal "${expectedHeader}" (got "${title}")`
        );
      });
      await toasts.dismissAll();
    },

    async ensureAllMenuPopoversClosed() {
      await retry.tryForTime(5000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        const popoverExists = await find.existsByCssSelector('euiContextMenuPanel');
        expect(popoverExists).to.eql(false, 'All popovers should be closed');
      });
    },

    async ensureComboBoxClosed() {
      await retry.tryForTime(5000, async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        const comboBoxOpen = await testSubjects.exists('~comboBoxOptionsList', { timeout: 50 });
        expect(comboBoxOpen).to.eql(false, 'Combo box should be closed');
      });
    },

    async invokeTableRowAction(
      rowSelector: string,
      actionTestSubject: string,
      fromContextMenu: boolean = true
    ) {
      await retry.tryForTime(30 * 1000, async () => {
        if (fromContextMenu) {
          await this.ensureAllMenuPopoversClosed();

          await testSubjects.click(`${rowSelector} > euiCollapsedItemActionsButton`);
          await find.existsByCssSelector('euiContextMenuPanel');

          const isEnabled = await testSubjects.isEnabled(actionTestSubject);

          expect(isEnabled).to.eql(true, `Expected action "${actionTestSubject}" to be enabled.`);

          await testSubjects.click(actionTestSubject);
        } else {
          const isEnabled = await testSubjects.isEnabled(`${rowSelector} > ${actionTestSubject}`);
          expect(isEnabled).to.eql(true, `Expected action "${actionTestSubject}" to be enabled.`);
          await testSubjects.click(`${rowSelector} > ${actionTestSubject}`);
        }
      });
    },

    async assertDatePickerDataTierOptionsVisible(shouldBeVisible: boolean) {
      const selector = 'mlDatePickerButtonDataTierOptions';
      if (shouldBeVisible === true) {
        await testSubjects.existOrFail(selector);
      } else {
        await testSubjects.missingOrFail(selector);
      }
    },

    async toggleSwitchIfNeeded(testSubj: string, targetState: boolean) {
      await testSubjects.setEuiSwitch(testSubj, targetState ? 'check' : 'uncheck');
    },
  };
}
