/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  describe('classification cloning', function() {
    this.tags(['smoke']);

    const testDataList: Array<{
      suiteTitle: string;
      job: Partial<DataFrameAnalyticsConfig>;
    }> = (() => {
      const timestamp = Date.now();

      return [
        {
          suiteTitle: 'classification job supported by the form',
          job: {
            id: `bm_1_${timestamp}`,
            description:
              "Classification job based on 'bank-marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
            source: {
              index: ['bank-marketing*'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-bm_1_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              classification: {
                dependent_variable: 'y',
                training_percent: 2,
              },
            },
            analyzed_fields: {
              includes: [],
              excludes: [],
            },
            model_memory_limit: '350mb',
            allow_lazy_start: false,
          },
        },
      ];
    })();

    before(async () => {
      await esArchiver.load('ml/bm_classification');
      // Create jobs for cloning
      for (const testData of testDataList) {
        await ml.api.createDataFrameAnalyticsJob(testData.job as DataFrameAnalyticsConfig);
      }

      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      // Clean destination indices of the original jobs
      for (const testData of testDataList) {
        await ml.api.deleteIndices(testData.job.dest!.index);
      }
      await esArchiver.unload('ml/bm_classification');
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function() {
        const cloneJobId = `${testData.job.id}_clone`;
        const cloneDestIndex = `${testData.job!.dest!.index}_clone`;

        before(async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.job.id as string);
          await ml.dataFrameAnalyticsTable.cloneJob(testData.job.id as string);
        });

        after(async () => {
          await ml.api.deleteIndices(cloneDestIndex);
        });

        it('should open the flyout with a proper header', async () => {
          expect(await ml.dataFrameAnalyticsCreation.getHeaderText()).to.be(
            `Clone job from ${testData.job.id}`
          );
        });

        it('should have correct init form values', async () => {
          await ml.dataFrameAnalyticsCreation.assertInitialCloneJobForm(
            testData.job as DataFrameAnalyticsConfig
          );
        });

        it('should have disabled Create button on open', async () => {
          expect(await ml.dataFrameAnalyticsCreation.isCreateButtonDisabled()).to.be(true);
        });

        it('should enable Create button on a valid form input', async () => {
          await ml.dataFrameAnalyticsCreation.setJobId(cloneJobId);
          await ml.dataFrameAnalyticsCreation.setDestIndex(cloneDestIndex);
          expect(await ml.dataFrameAnalyticsCreation.isCreateButtonDisabled()).to.be(false);
        });

        it('should create a clone job', async () => {
          await ml.dataFrameAnalyticsCreation.createAnalyticsJob();
        });

        it('should start the clone analytics job', async () => {
          await ml.dataFrameAnalyticsCreation.assertStartButtonExists();
          await ml.dataFrameAnalyticsCreation.startAnalyticsJob();
        });

        it('should close the create job flyout', async () => {
          await ml.dataFrameAnalyticsCreation.assertCloseButtonExists();
          await ml.dataFrameAnalyticsCreation.closeCreateAnalyticsJobFlyout();
        });

        it('displays the created job in the analytics table', async () => {
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(cloneJobId);
          const rows = await ml.dataFrameAnalyticsTable.parseAnalyticsTable();
          const filteredRows = rows.filter(row => row.id === cloneJobId);
          expect(filteredRows).to.have.length(
            1,
            `Filtered analytics table should have 1 row for job id '${cloneJobId}' (got matching items '${filteredRows}')`
          );
        });
      });
    }
  });
}
