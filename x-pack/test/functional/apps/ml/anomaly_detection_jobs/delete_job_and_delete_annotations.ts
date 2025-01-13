/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ANNOTATION_TYPE } from '@kbn/ml-plugin/common/constants/annotations';
import { FtrProviderContext } from '../../../ftr_provider_context';
import {
  SINGLE_METRIC_JOB_CONFIG,
  MULTI_METRIC_JOB_CONFIG,
} from '../../../../api_integration/apis/ml/jobs/common_jobs';

export default function ({ getService }: FtrProviderContext) {
  const config = getService('config');
  const esNode = config.get('esTestCluster.ccs')
    ? getService('remoteEsArchiver' as 'esArchiver')
    : getService('esArchiver');
  const ml = getService('ml');

  const remoteName = 'ftr-remote:';
  const esIndexPatternName = 'ft_farequote';
  const esIndexPatternString = config.get('esTestCluster.ccs')
    ? remoteName + esIndexPatternName
    : esIndexPatternName;

  const testSetupJobConfigs = [SINGLE_METRIC_JOB_CONFIG, MULTI_METRIC_JOB_CONFIG];

  async function createAnnotation(jobId: string, annotation: string) {
    await ml.api.indexAnnotation({
      timestamp: 1549756524346,
      end_timestamp: 1549766472273,
      annotation,
      job_id: jobId,
      type: ANNOTATION_TYPE.ANNOTATION,
      detector_index: 0,
      event: 'user',
    });
  }

  const testConfigs = [
    {
      suiteTitle: 'does not delete annotations',
      deleteAnnotations: false,
      expectedAnnotations: {
        beforeDelete: 1,
        afterDelete: 1,
      },
      jobId: SINGLE_METRIC_JOB_CONFIG.job_id,
    },
    {
      suiteTitle: 'deletes annotations',
      deleteAnnotations: true,
      expectedAnnotations: {
        beforeDelete: 1,
        afterDelete: 0,
      },
      jobId: SINGLE_METRIC_JOB_CONFIG.job_id,
    },
  ];

  describe('delete job', function () {
    this.tags(['ml']);
    before(async () => {
      await esNode.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createDataViewIfNeeded(esIndexPatternString, '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.deleteDataViewByTitle(esIndexPatternString);
    });

    for (const { suiteTitle, jobId, deleteAnnotations, expectedAnnotations } of testConfigs) {
      describe(suiteTitle, function () {
        before(async () => {
          for (const job of testSetupJobConfigs) {
            await ml.api.createAnomalyDetectionJob(job);
          }
        });

        after(async () => {
          await ml.api.cleanMlIndices();
        });

        it('deletes the job', async () => {
          await ml.testExecution.logTestStep('create annotation');
          await createAnnotation(jobId, 'test test test');

          await ml.testExecution.logTestStep('check annotation count');
          await ml.api.assertAnnotationsCount(jobId, expectedAnnotations.beforeDelete);

          await ml.testExecution.logTestStep('job creation loads the job management page');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep('job deletion triggers the delete action');
          await ml.jobTable.clickDeleteJobAction(jobId);

          await ml.testExecution.logTestStep('check delete annotations switch');
          await ml.jobTable.clickDeleteAnnotationsInDeleteJobModal(deleteAnnotations);
          await ml.testExecution.logTestStep('job deletion confirms the delete modal');
          await ml.jobTable.confirmDeleteJobModal();
          await ml.api.waitForAnomalyDetectionJobNotToExist(jobId, 30 * 1000);

          await ml.testExecution.logTestStep(
            'job deletion does not display the deleted job in the job list any more'
          );
          await ml.jobTable.filterWithSearchString(jobId, 0);

          await ml.testExecution.logTestStep(
            'job deletion does not have results for the deleted job any more'
          );
          await ml.api.assertNoJobResultsExist(jobId);

          await ml.testExecution.logTestStep('check annotation count after job deletion');
          await ml.api.assertAnnotationsCount(jobId, expectedAnnotations.afterDelete);
        });
      });
    }
  });
}
