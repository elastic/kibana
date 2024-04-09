/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { JOB_STATE } from '@kbn/ml-plugin/common';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { getCommonRequestHeader } from '../../../services/ml/common_api';
import { USER } from '../../../services/ml/security_common';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const supertest = getService('supertestWithoutAuth');

  const jobId = `fq_single_1_job_list_test_${Date.now()}`;
  const calendarId = `test-calendar-${Date.now()}`;
  const jobsSummaryId = `jobs_summary_fq_multi_${Date.now()}`;

  const multiMetricJobConfig: Job = {
    allow_lazy_open: false,
    model_snapshot_retention_days: 0,
    results_index_name: '',
    job_id: jobsSummaryId,
    description: 'mean(responsetime) partition=airline on farequote dataset with 1h bucket span',
    groups: ['farequote', 'automated', 'multi-metric'],
    analysis_config: {
      bucket_span: '1h',
      influencers: ['airline'],
      detectors: [
        { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '50mb' },
    model_plot_config: { enabled: true },
  };

  describe('job list', function () {
    this.tags(['ml']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      const JOB_CONFIG = ml.commonConfig.getADFqSingleMetricJobConfig(jobId);
      const DATAFEED_CONFIG = ml.commonConfig.getADFqDatafeedConfig(jobId);

      await ml.api.createAndRunAnomalyDetectionLookbackJob(JOB_CONFIG, DATAFEED_CONFIG);

      await ml.api.waitForJobState(jobId, JOB_STATE.CLOSED);
      await ml.api.openAnomalyDetectionJob(jobId);

      const { body, status } = await supertest
        .post(`/internal/ml/anomaly_detectors/${jobId}/_forecast`)
        .auth(USER.ML_POWERUSER, ml.securityCommon.getPasswordForUser(USER.ML_POWERUSER))
        .set(getCommonRequestHeader('1'))
        .send({ duration: '1d' });
      ml.api.assertResponseStatusCode(200, status, body);

      await ml.api.assertForecastResultsExist(jobId);

      await ml.api.createAnomalyDetectionJob(multiMetricJobConfig);

      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSettings();
      await ml.settings.navigateToCalendarManagement();

      await ml.settingsCalendar.assertCreateCalendarButtonEnabled(true);
      await ml.settingsCalendar.navigateToCalendarCreationPage();

      await ml.settingsCalendar.waitForFormEnabled();

      await ml.settingsCalendar.assertJobSelectionExists();
      await ml.settingsCalendar.assertJobSelectionEnabled(true);
      await ml.settingsCalendar.assertJobGroupSelectionExists();
      await ml.settingsCalendar.assertJobGroupSelectionEnabled(true);

      await ml.settingsCalendar.setCalendarId(calendarId);

      await ml.settingsCalendar.selectJob(jobId);

      await ml.settingsCalendar.saveCalendar();
      await ml.settingsCalendar.assertCalendarRowExists(calendarId);

      await ml.securityUI.loginAsMlPowerUser();

      await ml.navigation.navigateToMl();

      await ml.navigation.navigateToJobManagement();
    });

    after(async () => {
      await ml.api.closeAnomalyDetectionJob(jobId);
      await ml.api.cleanMlIndices();
      await ml.api.deleteAnomalyDetectionJobES(jobId);
      await ml.testResources.deleteDataViewByTitle('ft_farequote');
    });

    it('expanded row with connected calendar shows link to calendar', async () => {
      await ml.testExecution.logTestStep('calendar present for connected job');
      await ml.expandedJobDetails.assertJobRowCalendars(jobId, [calendarId]);
    });

    it('expanded row with forecast should display open forecast button', async () => {
      await ml.testExecution.logTestStep('open forecast link present');
      await ml.expandedJobDetails.assertForecastElements(jobId);
    });

    it('expanded row with annotations can be edited', async () => {
      await ml.testExecution.logTestStep('can edit annotations from expanded row');
      await ml.expandedJobDetails.assertAnnotationsEdit(jobId);
    });

    it('expanded row with data feed flyout should display correctly', async () => {
      await ml.testExecution.logTestStep(
        'open data feed flyout and verify the title displays correctly'
      );
      await ml.expandedJobDetails.assertDataFeedFlyout(jobId);
    });

    it('expanded row with model snapshot should display correctly', async () => {
      await ml.testExecution.logTestStep(
        'open model snapshot management and verify the action buttons are present'
      );
      await ml.expandedJobDetails.assertModelSnapshotManagement(jobId);
    });

    it('multi-selection with one opened job should only present the opened job when job list is filtered by the Opened button', async () => {
      await ml.expandedJobDetails.selectAllJobs();
      await ml.expandedJobDetails.assertColumnState('Opened', 'opened');
      await ml.expandedJobDetails.assertColumnId(jobId);
      await ml.expandedJobDetails.assertJobListMultiSelectionText('1 job selected');
    });

    it('multi-selection with one closed job should only present the closed job when job list is filtered by the Closed button', async () => {
      await ml.expandedJobDetails.selectAllJobs();
      await ml.expandedJobDetails.assertColumnState('Closed', 'closed');
      await ml.expandedJobDetails.assertColumnId(jobsSummaryId);
    });
  });
}
