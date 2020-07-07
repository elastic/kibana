/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  // Flaky: https://github.com/elastic/kibana/issues/70885
  describe.skip('jobs cloning supported by UI form', function () {
    const testDataList: Array<{
      suiteTitle: string;
      archive: string;
      indexPattern: { name: string; timeField: string };
      job: DeepPartial<DataFrameAnalyticsConfig>;
    }> = (() => {
      const timestamp = Date.now();

      return [
        {
          suiteTitle: 'classification job supported by the form',
          archive: 'ml/bm_classification',
          indexPattern: { name: 'ft_bank_marketing', timeField: '@timestamp' },
          job: {
            id: `bm_1_${timestamp}`,
            description:
              "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '20'",
            source: {
              index: ['ft_bank_marketing'],
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
                prediction_field_name: 'test',
                dependent_variable: 'y',
                training_percent: 20,
              },
            },
            analyzed_fields: {
              includes: [],
              excludes: [],
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
        },
        {
          suiteTitle: 'outlier detection job supported by the form',
          archive: 'ml/ihp_outlier',
          indexPattern: { name: 'ft_ihp_outlier', timeField: '@timestamp' },
          job: {
            id: `ihp_1_${timestamp}`,
            description: 'This is the job description',
            source: {
              index: ['ft_ihp_outlier'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-ihp_1_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              outlier_detection: {},
            },
            analyzed_fields: {
              includes: [],
              excludes: [],
            },
            model_memory_limit: '5mb',
          },
        },
        {
          suiteTitle: 'regression job supported by the form',
          archive: 'ml/egs_regression',
          indexPattern: { name: 'ft_egs_regression', timeField: '@timestamp' },
          job: {
            id: `egs_1_${timestamp}`,
            description: 'This is the job description',
            source: {
              index: ['ft_egs_regression'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-egs_1_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              regression: {
                prediction_field_name: 'test',
                dependent_variable: 'stab',
                training_percent: 20,
              },
            },
            analyzed_fields: {
              includes: [],
              excludes: [],
            },
            model_memory_limit: '20mb',
          },
        },
      ];
    })();

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        const cloneJobId = `${testData.job.id}_clone`;
        const cloneDestIndex = `${testData.job!.dest!.index}_clone`;

        before(async () => {
          await esArchiver.loadIfNeeded(testData.archive);
          await ml.testResources.createIndexPatternIfNeeded(
            testData.indexPattern.name,
            testData.indexPattern.timeField
          );
          await ml.api.createDataFrameAnalyticsJob(testData.job as DataFrameAnalyticsConfig);

          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(testData.job.id as string);
          await ml.dataFrameAnalyticsTable.cloneJob(testData.job.id as string);
        });

        after(async () => {
          await ml.api.deleteIndices(cloneDestIndex);
          await ml.api.deleteIndices(testData.job.dest!.index as string);
          await ml.testResources.deleteIndexPatternByTitle(testData.job.dest!.index as string);
        });

        it('should open the wizard with a proper header', async () => {
          const headerText = await ml.dataFrameAnalyticsCreation.getHeaderText();
          expect(headerText).to.match(/Clone job/);
          await ml.dataFrameAnalyticsCreation.assertConfigurationStepActive();
        });

        it('should have correct init form values for config step', async () => {
          await ml.dataFrameAnalyticsCreation.assertInitialCloneJobConfigStep(
            testData.job as DataFrameAnalyticsConfig
          );
        });

        it('should continue to the additional options step', async () => {
          await ml.dataFrameAnalyticsCreation.continueToAdditionalOptionsStep();
        });

        it('should have correct init form values for additional options step', async () => {
          await ml.dataFrameAnalyticsCreation.assertInitialCloneJobAdditionalOptionsStep(
            testData.job.analysis as DataFrameAnalyticsConfig['analysis']
          );
        });

        it('should continue to the details step', async () => {
          await ml.dataFrameAnalyticsCreation.continueToDetailsStep();
        });

        it('should have correct init form values for details step', async () => {
          await ml.dataFrameAnalyticsCreation.assertInitialCloneJobDetailsStep(
            testData.job as DataFrameAnalyticsConfig
          );
          await ml.dataFrameAnalyticsCreation.setJobId(cloneJobId);
          await ml.dataFrameAnalyticsCreation.setDestIndex(cloneDestIndex);
        });

        it('should continue to the create step', async () => {
          await ml.dataFrameAnalyticsCreation.continueToCreateStep();
        });

        it('should have enabled Create button on a valid form input', async () => {
          expect(await ml.dataFrameAnalyticsCreation.isCreateButtonDisabled()).to.be(false);
        });

        it('should create a clone job', async () => {
          await ml.dataFrameAnalyticsCreation.createAnalyticsJob(cloneJobId);
        });

        it('should finish analytics processing', async () => {
          await ml.dataFrameAnalytics.waitForAnalyticsCompletion(cloneJobId);
        });

        it('should display the created job in the analytics table', async () => {
          await ml.dataFrameAnalyticsCreation.navigateToJobManagementPage();
          await ml.dataFrameAnalyticsTable.refreshAnalyticsTable();
          await ml.dataFrameAnalyticsTable.filterWithSearchString(cloneJobId);
          const rows = await ml.dataFrameAnalyticsTable.parseAnalyticsTable();
          const filteredRows = rows.filter((row) => row.id === cloneJobId);
          expect(filteredRows).to.have.length(
            1,
            `Filtered analytics table should have 1 row for job id '${cloneJobId}' (got matching items '${filteredRows}')`
          );
        });
      });
    }
  });
}
