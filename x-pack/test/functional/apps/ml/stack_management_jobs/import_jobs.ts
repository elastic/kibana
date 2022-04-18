/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { JobType } from '@kbn/ml-plugin/common/types/saved_objects';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const testDataListPositive = [
    {
      filePath: path.join(__dirname, 'files_to_import', 'anomaly_detection_jobs_7.16.json'),
      expected: {
        jobType: 'anomaly-detector' as JobType,
        jobIds: ['ad-test1', 'ad-test3'],
        skippedJobIds: ['ad-test2'],
      },
    },
    {
      filePath: path.join(__dirname, 'files_to_import', 'data_frame_analytics_jobs_7.16.json'),
      expected: {
        jobType: 'data-frame-analytics' as JobType,
        jobIds: ['dfa-test1'],
        skippedJobIds: ['dfa-test2'],
      },
    },
  ];

  describe('import jobs', function () {
    this.tags(['mlqa']);
    before(async () => {
      await ml.api.cleanMlIndices();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/bm_classification');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.createIndexPatternIfNeeded('ft_bank_marketing', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToStackManagement();
      await ml.navigation.navigateToStackManagementJobsListPage();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_bank_marketing');
    });

    for (const testData of testDataListPositive) {
      it('selects and reads file', async () => {
        await ml.testExecution.logTestStep('selects job import');
        await ml.stackManagementJobs.openImportFlyout();
        await ml.stackManagementJobs.selectFileToImport(testData.filePath);
      });
      it('has the correct importable jobs', async () => {
        await ml.stackManagementJobs.assertCorrectTitle(
          [...testData.expected.jobIds, ...testData.expected.skippedJobIds].length,
          testData.expected.jobType
        );
        await ml.stackManagementJobs.assertJobIdsExist(testData.expected.jobIds);
        await ml.stackManagementJobs.assertJobIdsSkipped(testData.expected.skippedJobIds);
      });

      it('imports jobs', async () => {
        await ml.stackManagementJobs.importJobs();
      });

      it('ensures jobs have been imported', async () => {
        if (testData.expected.jobType === 'anomaly-detector') {
          await ml.navigation.navigateToStackManagementJobsListPageAnomalyDetectionTab();
          for (const id of testData.expected.jobIds) {
            await ml.jobTable.filterWithSearchString(id, 1, 'stackMgmtJobList');
          }
          for (const id of testData.expected.skippedJobIds) {
            await ml.jobTable.filterWithSearchString(id, 0, 'stackMgmtJobList');
          }
        } else {
          await ml.navigation.navigateToStackManagementJobsListPageAnalyticsTab();
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable('stackMgmtJobList');
          for (const id of testData.expected.jobIds) {
            await ml.dataFrameAnalyticsTable.assertAnalyticsJobDisplayedInTable(
              id,
              true,
              'mlAnalyticsRefreshListButton'
            );
          }
          for (const id of testData.expected.skippedJobIds) {
            await ml.dataFrameAnalyticsTable.assertAnalyticsJobDisplayedInTable(
              id,
              false,
              'mlAnalyticsRefreshListButton'
            );
          }
        }
      });
    }

    describe('correctly fails to import bad data', async () => {
      it('selects and reads file', async () => {
        await ml.testExecution.logTestStep('selects job import');
        await ml.stackManagementJobs.openImportFlyout();
        await ml.stackManagementJobs.selectFileToImport(
          path.join(__dirname, 'files_to_import', 'bad_data.json'),
          true
        );
      });
    });
  });
}
