/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('total feature importance panel and decision path popover', function () {
    const testDataList: Array<{
      suiteTitle: string;
      archive: string;
      indexPattern: { name: string; timeField: string };
      job: DeepPartial<DataFrameAnalyticsConfig>;
    }> = (() => {
      const timestamp = Date.now();

      return [
        {
          suiteTitle: 'binary classification job',
          archive: 'ml/ihp_outlier',
          indexPattern: { name: 'ft_ihp_outlier', timeField: '@timestamp' },
          job: {
            id: `ihp_fi_binary_${timestamp}`,
            description:
              "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '35'",
            source: {
              index: ['ft_ihp_outlier'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-ihp_fi_binary_${timestamp}`;
              },
              results_field: 'ml_central_air',
            },
            analyzed_fields: {
              includes: [
                'CentralAir',
                'GarageArea',
                'GarageCars',
                'YearBuilt',
                'Electrical',
                'Neighborhood',
                'Heating',
                '1stFlrSF',
              ],
            },
            analysis: {
              classification: {
                dependent_variable: 'CentralAir',
                num_top_feature_importance_values: 5,
                training_percent: 35,
                prediction_field_name: 'CentralAir_prediction',
                num_top_classes: -1,
              },
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
        },
        {
          suiteTitle: 'multi class classification job',
          archive: 'ml/ihp_outlier',
          indexPattern: { name: 'ft_ihp_outlier', timeField: '@timestamp' },
          job: {
            id: `ihp_fi_multi_${timestamp}`,
            description:
              "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '35'",
            source: {
              index: ['ft_ihp_outlier'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-ihp_fi_multi_${timestamp}`;
              },
              results_field: 'ml_heating_qc',
            },
            analyzed_fields: {
              includes: [
                'CentralAir',
                'GarageArea',
                'GarageCars',
                'Electrical',
                'Neighborhood',
                'Heating',
                '1stFlrSF',
                'HeatingQC',
              ],
            },
            analysis: {
              classification: {
                dependent_variable: 'HeatingQC',
                num_top_feature_importance_values: 5,
                training_percent: 35,
                prediction_field_name: 'heatingqc',
                num_top_classes: -1,
              },
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
        },
        {
          suiteTitle: 'regression job',
          archive: 'ml/egs_regression',
          indexPattern: { name: 'ft_egs_regression', timeField: '@timestamp' },
          job: {
            id: `egs_fi_reg_${timestamp}`,
            description: 'This is the job description',
            source: {
              index: ['ft_egs_regression'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-egs_fi_reg_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              regression: {
                prediction_field_name: 'test',
                dependent_variable: 'stab',
                num_top_feature_importance_values: 5,
                training_percent: 35,
              },
            },
            analyzed_fields: {
              includes: [
                'g1',
                'g2',
                'g3',
                'g4',
                'p1',
                'p2',
                'p3',
                'p4',
                'stab',
                'tau1',
                'tau2',
                'tau3',
                'tau4',
              ],
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
      for (const testData of testDataList) {
        await esArchiver.loadIfNeeded(testData.archive);
        await ml.testResources.createIndexPatternIfNeeded(
          testData.indexPattern.name,
          testData.indexPattern.timeField
        );
        await ml.api.createAndRunDFAJob(testData.job as DataFrameAnalyticsConfig);
      }
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        before(async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
          await ml.dataFrameAnalyticsTable.openResultsView(testData.job.id as string);
        });

        after(async () => {
          await ml.api.deleteIndices(testData.job.dest!.index as string);
          await ml.testResources.deleteIndexPatternByTitle(testData.job.dest!.index as string);
        });

        it('should display the total feature importance in the results view', async () => {
          await ml.dataFrameAnalyticsResults.assertTotalFeatureImportanceEvaluatePanelExists();
        });

        it('should display the feature importance decision path in the data grid', async () => {
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();
          await ml.dataFrameAnalyticsResults.openFeatureImportanceDecisionPathPopover();
          await ml.dataFrameAnalyticsResults.assertFeatureImportanceDecisionPathElementsExists();
          await ml.dataFrameAnalyticsResults.assertFeatureImportanceDecisionPathChartElementsExists();
        });
      });
    }
  });
}
