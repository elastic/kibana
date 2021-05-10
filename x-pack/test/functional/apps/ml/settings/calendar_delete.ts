/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  const testDataList = [1, 2].map((n) => ({
    calendarId: `test_delete_calendar_${n}`,
    description: `test description ${n}`,
  }));

  describe('calendar delete', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();

      await asyncForEach(testDataList, async ({ calendarId, description }) => {
        await ml.api.createCalendar(calendarId, {
          description,
        });
      });
    });

    after(async () => {
      await ml.api.cleanMlIndices();

      // clean up created calendars
      await asyncForEach(testDataList, async ({ calendarId }) => {
        await ml.api.deleteCalendar(calendarId);
      });
    });

    it('deletes multiple calendars', async () => {
      await ml.testExecution.logTestStep('calendar delete loads the calendar list management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('calendar delete selects multiple calendars for deletion');
      await asyncForEach(testDataList, async ({ calendarId }) => {
        await ml.settingsCalendar.assertCalendarRowExists(calendarId);
        await ml.settingsCalendar.selectCalendarRow(calendarId);
      });

      await ml.testExecution.logTestStep('calendar delete clicks the delete button');
      await ml.settingsCalendar.deleteCalendar();

      await ml.testExecution.logTestStep(
        'calendar delete validates the calendars are deleted from the table'
      );
      await asyncForEach(testDataList, async ({ calendarId }) => {
        await ml.settingsCalendar.assertCalendarRowNotExists(calendarId);
      });
    });
  });
}
