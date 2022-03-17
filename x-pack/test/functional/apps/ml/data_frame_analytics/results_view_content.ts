/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepPartial } from '../../../../../plugins/ml/common/types/common';
import { DataFrameAnalyticsConfig } from '../../../../../plugins/ml/public/application/data_frame_analytics/common';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  // FLAKY: https://github.com/elastic/kibana/issues/126422
  describe.skip('results view content and total feature importance', function () {
    const testDataList: Array<{
      suiteTitle: string;
      archive: string;
      indexPattern: { name: string; timeField: string };
      job: DeepPartial<DataFrameAnalyticsConfig>;
      sortBy: {
        column: string;
        sortDirection: 'asc' | 'desc';
      };
      expected: {
        histogramCharts: Array<{ chartAvailable: boolean; id: string; legend?: string }>;
        sortBy: {
          columnIndex: number;
          expectedValues: string[];
        };
      };
    }> = (() => {
      const timestamp = Date.now();

      return [
        {
          suiteTitle: 'binary classification job',
          archive: 'x-pack/test/functional/es_archives/ml/ihp_outlier',
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
                max_trees: 10,
              },
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
          sortBy: {
            column: 'ml_central_air.is_training',
            // asc is `False-True`
            sortDirection: 'asc',
          },
          expected: {
            histogramCharts: [
              // We are not checking for chart's legend content here
              // because results can always change
              { chartAvailable: true, id: 'ml_central_air.is_training' },
              { chartAvailable: true, id: 'ml_central_air.CentralAir_prediction' },
              { chartAvailable: true, id: 'CentralAir' },
              { chartAvailable: true, id: 'ml_central_air.prediction_probability' },
              { chartAvailable: false, id: 'ml_central_air.feature_importance' },
              { chartAvailable: true, id: 'ml_central_air.prediction_score' },
              { chartAvailable: false, id: 'ml_central_air.top_classes' },
              { chartAvailable: true, id: '1stFlrSF' },
            ],
            sortBy: {
              columnIndex: 0,
              expectedValues: ['false'],
            },
          },
        },
        {
          suiteTitle: 'multi class classification job',
          archive: 'x-pack/test/functional/es_archives/ml/ihp_outlier',
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
                max_trees: 10,
              },
            },
            model_memory_limit: '60mb',
            allow_lazy_start: false,
          },
          sortBy: {
            column: 'ml_heating_qc.is_training',
            // desc is `True-False`
            sortDirection: 'desc',
          },
          expected: {
            histogramCharts: [
              { chartAvailable: true, id: 'ml_heating_qc.is_training' },
              { chartAvailable: true, id: 'ml_heating_qc.heatingqc' },
              { chartAvailable: true, id: 'HeatingQC' },
              { chartAvailable: true, id: 'ml_heating_qc.prediction_probability' },
              { chartAvailable: false, id: 'ml_heating_qc.feature_importance' },
              { chartAvailable: true, id: 'ml_heating_qc.prediction_score' },
              {
                chartAvailable: false,
                id: 'ml_heating_qc.top_classes',
                legend: 'Chart not supported.',
              },
              { chartAvailable: true, id: '1stFlrSF' },
            ],
            sortBy: {
              columnIndex: 0,
              expectedValues: ['true'],
            },
          },
        },
        {
          suiteTitle: 'regression job',
          archive: 'x-pack/test/functional/es_archives/ml/egs_regression',
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
                max_trees: 10,
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
          sortBy: {
            column: 'ml.is_training',
            // desc is `True-False`
            sortDirection: 'desc',
          },
          expected: {
            histogramCharts: [
              { chartAvailable: true, id: 'ml.is_training' },
              { chartAvailable: true, id: 'ml.test' },
              { chartAvailable: true, id: 'stab', legend: '-0.06 - 0.11' },
              { chartAvailable: true, id: 'g1', legend: '0.05 - 1' },
              { chartAvailable: true, id: 'g2', legend: '0.05 - 1' },
              { chartAvailable: true, id: 'g3', legend: '0.05 - 1' },
              { chartAvailable: true, id: 'g4', legend: '0.05 - 1' },
            ],
            sortBy: {
              columnIndex: 0,
              expectedValues: ['true'],
            },
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
      for (const testData of testDataList) {
        await ml.testResources.deleteIndexPatternByTitle(testData.indexPattern.name);
      }
    });

    for (const testData of testDataList) {
      describe(`${testData.suiteTitle}`, function () {
        before(async () => {
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToDataFrameAnalytics();
          await ml.dataFrameAnalyticsTable.waitForAnalyticsToLoad();
          await ml.testResources.createIndexPatternIfNeeded(testData.job.dest!.index as string);
          await ml.dataFrameAnalyticsTable.openResultsView(testData.job.id as string);
        });

        after(async () => {
          await ml.api.deleteIndices(testData.job.dest!.index as string);
          await ml.testResources.deleteIndexPatternByTitle(testData.job.dest!.index as string);
        });

        it('should display the total feature importance in the results view', async () => {
          await ml.dataFrameAnalyticsResults.assertTotalFeatureImportanceEvaluatePanelExists();
        });

        it('should display the feature importance decision path', async () => {
          await ml.dataFrameAnalyticsResults.assertResultsTableExists();
          await ml.dataFrameAnalyticsResults.assertResultsTableNotEmpty();
          await ml.dataFrameAnalyticsResults.openFeatureImportancePopover();
          await ml.dataFrameAnalyticsResults.assertFeatureImportancePopoverContent();
        });

        it('should display the histogram charts', async () => {
          await ml.testExecution.logTestStep(
            'displays the histogram charts when option is enabled'
          );
          await ml.dataFrameAnalyticsResults.enableResultsTablePreviewHistogramCharts(true);
          await ml.dataFrameAnalyticsResults.assertResultsTablePreviewHistogramCharts(
            testData.expected.histogramCharts
          );

          await ml.testExecution.logTestStep('hides the histogram charts when option is disabled');
          await ml.dataFrameAnalyticsResults.enableResultsTablePreviewHistogramCharts(false);
          await ml.dataFrameAnalyticsResults.assertResultsTablePreviewHistogramChartsMissing(
            testData.expected.histogramCharts
          );
        });

        it('should sort and hide/show columns correctly', async () => {
          await ml.testExecution.logTestStep('sorts table');
          await ml.dataFrameAnalyticsResults.toggleColumnSortPopoverState(true);
          await ml.dataFrameAnalyticsResults.setColumnToSortBy(
            testData.sortBy.column,
            testData.sortBy.sortDirection
          );

          await ml.testExecution.logTestStep('shows all and hides all columns');
          await ml.dataFrameAnalyticsResults.showAllResultsTableColumns();
          await ml.dataFrameAnalyticsResults.hideAllResultsTableColumns();
        });
      });
    }
  });
}
