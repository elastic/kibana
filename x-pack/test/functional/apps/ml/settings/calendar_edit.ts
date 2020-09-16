/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');
  const comboBox = getService('comboBox');

  const calendarId = 'test_edit_calendar_id';
  const testEvents = [
    { description: 'event_1', start_time: 1513641600000, end_time: 1513728000000 },
    { description: 'event_2', start_time: 1513814400000, end_time: 1513900800000 },
  ];
  const jobConfigs = [
    ml.commonConfig.getADFqMultiMetricJobConfig('test_calendar_ad_1'),
    ml.commonConfig.getADFqSingleMetricJobConfig('test_calendar_ad_2'),
  ];
  const newJobGroups = ['farequote'];

  describe('calendar edit', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');

      await asyncForEach(jobConfigs, async (jobConfig) => {
        await ml.api.createAnomalyDetectionJob(jobConfig);
      });

      await ml.api.createCalendar(calendarId, {
        job_ids: jobConfigs.map((c) => c.job_id),
        description: 'Test calendar',
      });
      await ml.api.createCalendarEvents(calendarId, testEvents);

      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    afterEach(async () => {
      await ml.api.deleteCalendar(calendarId);
    });

    it('calendar edit loads the calendars list and finds calendar to edit', async () => {
      await ml.testExecution.logTestStep('calendar creation loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('calendar creation loads the new calendar edit page');
      await ml.settingsCalendar.openCalendarEditForm(calendarId);

      await ml.testExecution.logTestStep(
        'calendar creation deselects previous job selection and assigns new job groups'
      );
      await comboBox.clear('mlCalendarJobSelection');
      await asyncForEach(newJobGroups, async (newJobGroup) => {
        await ml.settingsCalendar.selectJobGroup(newJobGroup);
      });

      await ml.testExecution.logTestStep('calendar creation finds and deletes old events');

      await asyncForEach(testEvents, async ({ description }) => {
        await ml.settingsCalendar.deleteCalendarEventRow(description);
      });

      await ml.testExecution.logTestStep('calendar creation creates new calendar event');
      await ml.settingsCalendar.createNewCalendarEvent('holiday');
      await ml.settingsCalendar.addNewCalendarEvent();
      await ml.settingsCalendar.assertEventRowExists('holiday');

      await ml.testExecution.logTestStep(
        'saves the new calendar and displays it in the list of calendars '
      );
      await ml.settingsCalendar.saveCalendar();
      await ml.settingsCalendar.assertCalendarRowExists(calendarId);
    });
  });
}
