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

  const calendarId = 'test_calendar_id';
  const jobConfigs = [createJobConfig('test_calendar_ad_1'), createJobConfig('test_calendar_ad_2')];

  describe('calendar creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');

      await asyncForEach(jobConfigs, async (jobConfig) => {
        // @ts-expect-error not full interface
        await ml.api.createAnomalyDetectionJob(jobConfig);
      });
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

    it('creates new calendar that applies to all jobs', async () => {
      await ml.testExecution.logTestStep('calendar creation loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('calendar creation loads the new calendar edit page');
      await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);
      await ml.settingsCalendar.navigateToCalendarCreationPage();

      await ml.settingsCalendar.waitForFormEnabled();

      await ml.testExecution.logTestStep('calendar creation sets calendar to apply to all jobs');
      await ml.settingsCalendar.toggleApplyToAllJobsSwitch(true);
      await ml.settingsCalendar.assertJobSelectionNotExists();
      await ml.settingsCalendar.assertJobGroupSelectionNotExists();

      await ml.testExecution.logTestStep('calendar creation sets the calendar id and description');
      await ml.settingsCalendar.setCalendarId(calendarId);
      await ml.settingsCalendar.setCalendarDescription('test calendar description');

      await ml.testExecution.logTestStep('calendar creation creates new calendar event');
      await ml.settingsCalendar.openNewCalendarEventForm();
      await ml.settingsCalendar.setCalendarEventDescription('holiday');
      await ml.settingsCalendar.addNewCalendarEvent();
      await ml.settingsCalendar.assertEventRowExists('holiday');

      await ml.testExecution.logTestStep(
        'calendar creation saves the new calendar and displays it in the list of calendars '
      );
      await ml.settingsCalendar.saveCalendar();

      await ml.settingsCalendar.assertCalendarRowExists(calendarId);
    });

    it('creates new calendar that applies to specific jobs', async () => {
      await ml.testExecution.logTestStep('calendar creation loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('calendar creation loads the new calendar edit page');
      await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);
      await ml.settingsCalendar.navigateToCalendarCreationPage();

      await ml.settingsCalendar.waitForFormEnabled();

      await ml.testExecution.logTestStep(
        'calendar creation verifies the job selection and job group section are displayed'
      );
      await ml.settingsCalendar.assertJobSelectionExists();
      await ml.settingsCalendar.assertJobSelectionEnabled(true);
      await ml.settingsCalendar.assertJobGroupSelectionExists();
      await ml.settingsCalendar.assertJobGroupSelectionEnabled(true);

      await ml.testExecution.logTestStep('calendar creation sets the calendar id');
      await ml.settingsCalendar.setCalendarId(calendarId);

      await ml.testExecution.logTestStep('calendar creation sets the job selection');
      await asyncForEach(jobConfigs, async (jobConfig) => {
        await ml.settingsCalendar.selectJob(jobConfig.job_id);
      });

      await ml.settingsCalendar.saveCalendar();
      await ml.settingsCalendar.assertCalendarRowExists(calendarId);
    });
  });
}
