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
          archive: 'ml/bm_classification',
          indexPattern: { name: 'ft_bank_marketing', timeField: '@timestamp' },
          job: {
            id: `bm_fi_binary_${timestamp}`,
            description:
              "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '50'",
            source: {
              index: ['ft_bank_marketing'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-bm_fi_binary_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              classification: {
                prediction_field_name: 'test',
                dependent_variable: 'y',
                training_percent: 50,
                num_top_feature_importance_values: 5,
              },
            },
            analyzed_fields: {
              includes: [
                'duration',
                'day.keyword',
                'age',
                'campaign',
                'job',
                'marital',
                'duration',
                'education',
                'y',
              ],
              excludes: [],
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
        },
        {
          suiteTitle: 'multi class classification job',
          archive: 'ml/bm_classification',
          indexPattern: { name: 'ft_bank_marketing', timeField: '@timestamp' },
          job: {
            id: `bm_fi_multi_${timestamp}`,
            description:
              "Classification job based on 'ft_bank_marketing' dataset with dependentVariable 'y' and trainingPercent '50'",
            source: {
              index: ['ft_bank_marketing'],
              query: {
                match_all: {},
              },
            },
            dest: {
              get index(): string {
                return `user-bm_fi_multi_${timestamp}`;
              },
              results_field: 'ml',
            },
            analysis: {
              classification: {
                prediction_field_name: 'test',
                dependent_variable: 'y',
                training_percent: 50,
                num_top_feature_importance_values: 5,
                num_top_classes: 5,
              },
            },
            analyzed_fields: {
              includes: [
                'age',
                'balance.keyword',
                'campaign',
                'cons_conf_idx',
                'contact',
                'day.keyword',
                'day_of_week',
                'default',
                'duration',
                'education',
                'emp_var_rate',
                'euribor3m',
                'housing',
                'job',
                'loan',
                'marital',
                'month',
                'nr_employed',
                'pdays',
                'poutcome',
                'previous',
                'y',
              ],
              excludes: [],
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
                training_percent: 50,
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
