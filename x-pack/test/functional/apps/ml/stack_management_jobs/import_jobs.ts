/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';

import { FtrProviderContext } from '../../../ftr_provider_context';
// import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';
import { JobType } from '../../../../../plugins/ml/common/types/saved_objects';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const testDataListPositive = [
    {
      filePath: path.join(__dirname, 'files_to_import', 'anomaly_detection_jobs.json'),
      expected: {
        jobType: 'anomaly-detector' as JobType,
        jobIds: ['test1', 'test3'],
        skippedJobIds: ['test2'],
      },
    },
  ];

  describe('import jobs', function () {
    this.tags(['mlqa']);
    before(async () => {
      await ml.api.cleanMlIndices();
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
      await ml.navigation.navigateToStackManagement();
      await ml.navigation.navigateToStackManagementJobsListPage();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
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
        await ml.jobTable.refreshJobList();
        for (const id of testData.expected.jobIds) {
          await ml.jobTable.filterWithSearchString(id);
        }
        for (const id of testData.expected.skippedJobIds) {
          await ml.jobTable.filterWithSearchString(id, 0);
        }
      });
    }
  });
}
