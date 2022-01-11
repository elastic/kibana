/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach, createJobConfig } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');
  const comboBox = getService('comboBox');

  const calendarId = 'test_edit_calendar_id';
  const testEvents = [
    { description: 'event_1', start_time: 1513641600000, end_time: 1513728000000 },
    { description: 'event_2', start_time: 1513814400000, end_time: 1513900800000 },
  ];
  const jobConfigs = [createJobConfig('test_calendar_ad_1'), createJobConfig('test_calendar_ad_2')];
  const newJobGroups = ['farequote'];

  describe('calendar edit', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');

      await asyncForEach(jobConfigs, async (jobConfig) => {
        // @ts-expect-error not full interface
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
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
    });

    afterEach(async () => {
      await ml.api.deleteCalendar(calendarId);
    });

    it('updates jobs, groups and events', async () => {
      await ml.testExecution.logTestStep('calendar edit loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('calendar edit opens existing calendar');
      await ml.settingsCalendar.openCalendarEditForm(calendarId);
      await ml.settingsCalendar.assertCalendarTitleValue(calendarId);

      await ml.testExecution.logTestStep(
        'calendar edit deselects previous job selection and assigns new job groups'
      );
      await comboBox.clear('mlCalendarJobSelection');
      await asyncForEach(newJobGroups, async (newJobGroup) => {
        await ml.settingsCalendar.selectJobGroup(newJobGroup);
      });

      await ml.testExecution.logTestStep('calendar edit deletes old events');

      await asyncForEach(testEvents, async ({ description }) => {
        await ml.settingsCalendar.deleteCalendarEventRow(description);
      });

      await ml.testExecution.logTestStep('calendar edit creates new calendar event');
      await ml.settingsCalendar.openNewCalendarEventForm();
      await ml.settingsCalendar.setCalendarEventDescription('holiday');
      await ml.settingsCalendar.addNewCalendarEvent();
      await ml.settingsCalendar.assertEventRowExists('holiday');

      await ml.testExecution.logTestStep(
        'calendar edit saves the new calendar and displays it in the list of calendars '
      );
      await ml.settingsCalendar.saveCalendar();
      await ml.settingsCalendar.assertCalendarRowExists(calendarId);

      await ml.testExecution.logTestStep('calendar edit re-opens the updated calendar');
      await ml.settingsCalendar.openCalendarEditForm(calendarId);
      await ml.settingsCalendar.assertCalendarTitleValue(calendarId);

      await ml.testExecution.logTestStep('calendar edit verifies the job selection is empty');
      await ml.settingsCalendar.assertJobSelection([]);

      await ml.testExecution.logTestStep(
        'calendar edit verifies the job group selection was updated'
      );
      await ml.settingsCalendar.assertJobGroupSelection(newJobGroups);

      await ml.testExecution.logTestStep(
        'calendar edit verifies calendar events updated correctly'
      );
      await asyncForEach(testEvents, async ({ description }) => {
        await ml.settingsCalendar.assertEventRowMissing(description);
      });
      await ml.settingsCalendar.assertEventRowExists('holiday');
    });
  });
}
