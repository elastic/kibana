/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { asyncForEach } from './common';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');
  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');

  const calendarId = 'test_calendar_id';
  const jobConfigs = [
    ml.commonConfig.getADFqMultiMetricJobConfig('test_calendar_ad_1'),
    ml.commonConfig.getADFqSingleMetricJobConfig('test_calendar_ad_2'),
  ];

  describe('calendar creation', function () {
    before(async () => {
      await esArchiver.loadIfNeeded('ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');

      await asyncForEach(jobConfigs, async (jobConfig) => {
        await ml.api.createAnomalyDetectionJob(jobConfig);
      });
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    afterEach(async () => {
      await ml.api.deleteCalendar(calendarId);
    });

    it('creates new calendar that applies to all jobs', async () => {
      await ml.testExecution.logTestStep('loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('loads the new calendar edit page');
      await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);
      await ml.settingsCalendar.navigateToCalendarCreationPage();

      await ml.testExecution.logTestStep('sets calendar to apply to all jobs');
      await ml.settingsCalendar.toggleApplyToAllJobsSwitch(true);
      await testSubjects.missingOrFail('mlCalendarJobSelection');
      await testSubjects.missingOrFail('mlCalendarJobGroupSelection');

      await ml.testExecution.logTestStep('sets the id and description');
      await ml.settingsCalendar.setCalendarId(calendarId);
      await ml.settingsCalendar.setCalendarDescription('test calendar description');

      await ml.testExecution.logTestStep('creates new calendar event');
      await ml.settingsCalendar.openNewCalendarEventForm();
      await ml.settingsCalendar.setCalendarEventDescription('holiday');
      await ml.settingsCalendar.addNewCalendarEvent();
      await ml.settingsCalendar.assertEventRowExists('holiday');

      await ml.testExecution.logTestStep(
        'saves the new calendar and displays it in the list of calendars '
      );
      await ml.settingsCalendar.saveCalendar();

      await ml.settingsCalendar.assertCalendarRowExists(calendarId);
    });

    it('creates new calendar that applies to specific jobs', async () => {
      await ml.testExecution.logTestStep('loads the calendar management page');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.testExecution.logTestStep('loads the new calendar edit page');
      await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);
      await ml.settingsCalendar.navigateToCalendarCreationPage();
      await ml.settingsCalendar.setCalendarId(calendarId);

      await testSubjects.existOrFail('mlCalendarJobSelection');
      await ml.settingsCalendar.assertJobSelectionEnabled(true);
      await testSubjects.existOrFail('mlCalendarJobGroupSelection');
      await ml.settingsCalendar.assertJobGroupSelectionEnabled(true);
      await testSubjects.click('mlCalendarJobSelection');

      await ml.testExecution.logTestStep('sets the job selection');
      await asyncForEach(jobConfigs, async (jobConfig) => {
        await ml.settingsCalendar.selectJob(jobConfig.job_id);
      });

      await ml.settingsCalendar.saveCalendar();
      await ml.settingsCalendar.assertCalendarRowExists(calendarId);
    });
  });
}
