/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { FtrProviderContext } from '../ftr_provider_context';

export function SvlTimePickerProvider({ getService, getPageObject }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const log = getService('log');
  const retry = getService('retry');
  const navigation = getPageObject('svlCommonNavigation');

  const showStartEndTimes = async () => {
    // This first await makes sure the superDatePicker has loaded before we check for the ShowDatesButton
    await testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 20000 });
    await retry.tryForTime(5000, async () => {
      const isShowDatesButton = await testSubjects.exists('superDatePickerShowDatesButton', {
        timeout: 50,
      });
      if (isShowDatesButton) {
        await testSubjects.click('superDatePickerShowDatesButton', 50);
      }
      await testSubjects.exists('superDatePickerstartDatePopoverButton', { timeout: 1000 });
      // Close the start date popover which opens automatically if `superDatePickerShowDatesButton` is clicked
      if (isShowDatesButton) {
        await testSubjects.click('superDatePickerstartDatePopoverButton');
      }
    });
  };

  const inputValue = async (dataTestSubj: string, value: string) => {
    if (browser.isFirefox) {
      const input = await testSubjects.find(dataTestSubj);
      await input.clearValue();
      await input.type(value);
    } else {
      await testSubjects.setValue(dataTestSubj, value);
    }
  };

  return {
    /**
     * @param fromTime MMM D, YYYY @ HH:mm:ss.SSS
     * @param toTime MMM D, YYYY @ HH:mm:ss.SSS
     * @param force time picker force update, default is false
     */
    async setAbsoluteRange(fromTime: string, toTime: string, force = false) {
      if (!force) {
        const currentUrl = decodeURI(await browser.getCurrentUrl());
        const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
        const startMoment = moment.utc(fromTime, DEFAULT_DATE_FORMAT).toISOString();
        const endMoment = moment.utc(toTime, DEFAULT_DATE_FORMAT).toISOString();
        if (currentUrl.includes(`time:(from:'${startMoment}',to:'${endMoment}'`)) {
          log.debug(
            `We already have the desired start (${fromTime}) and end (${toTime}) in the URL, returning from setAbsoluteRange`
          );
          return;
        }
      }
      log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
      await showStartEndTimes();

      // set to time
      await retry.waitFor(`endDate is set to ${toTime}`, async () => {
        await testSubjects.click('superDatePickerendDatePopoverButton');
        await testSubjects.click('superDatePickerAbsoluteTab');
        await testSubjects.click('superDatePickerAbsoluteDateInput');
        await inputValue('superDatePickerAbsoluteDateInput', toTime);
        await testSubjects.click('superDatePickerendDatePopoverButton'); // close popover because sometimes browser can't find start input
        const actualToTime = await testSubjects.getVisibleText(
          'superDatePickerendDatePopoverButton'
        );
        log.debug(`Validating 'endDate' - expected: '${toTime}, actual: ${actualToTime}'`);
        return toTime === actualToTime;
      });

      // set from time
      await retry.waitFor(`startDate is set to ${fromTime}`, async () => {
        await testSubjects.click('superDatePickerstartDatePopoverButton');
        await testSubjects.click('superDatePickerAbsoluteTab');
        await testSubjects.click('superDatePickerAbsoluteDateInput');
        await inputValue('superDatePickerAbsoluteDateInput', fromTime);
        await browser.pressKeys(browser.keys.ESCAPE);
        const actualFromTime = await testSubjects.getVisibleText(
          'superDatePickerstartDatePopoverButton'
        );
        log.debug(`Validating 'startDate' - expected: '${fromTime}, actual: ${actualFromTime}'`);
        return fromTime === actualFromTime;
      });

      await retry.waitFor('Timepicker popover to close', async () => {
        await browser.pressKeys(browser.keys.ESCAPE);
        return !(await testSubjects.exists('superDatePickerAbsoluteDateInput', {
          timeout: 50,
        }));
      });

      const superDatePickerApplyButtonExists = await testSubjects.exists(
        'superDatePickerApplyTimeButton',
        { timeout: 100 }
      );
      if (superDatePickerApplyButtonExists) {
        // Timepicker is in top nav
        // Click super date picker apply button to apply time range
        await testSubjects.click('superDatePickerApplyTimeButton');
      } else {
        // Timepicker is embedded in query bar
        // click query bar submit button to apply time range
        await testSubjects.click('querySubmitButton');
      }

      await navigation.awaitGlobalLoadingIndicatorHidden();
    },
  };
}
