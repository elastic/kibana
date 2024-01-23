/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { LogRateAnalysisType } from '@kbn/aiops-utils';

import type { Datafeed, Job } from '@kbn/ml-plugin/server/shared';

import type { FtrProviderContext } from '../../ftr_provider_context';

import type { LogRateAnalysisDataGenerator } from '../../services/aiops/log_rate_analysis_data_generator';

function getJobWithDataFeed(
  detectorFunction: string,
  detectorField?: string,
  partitionFieldName?: string
) {
  const postFix = `${detectorFunction}${detectorField ? `_${detectorField}` : ''}${
    partitionFieldName ? `_${partitionFieldName}` : ''
  }`;
  const jobId = `fq_single_1_smv_lra_${postFix}`;

  // @ts-expect-error not full interface
  const jobConfig: Job = {
    job_id: jobId,
    description: `${detectorFunction}(${
      detectorField ? detectorField : ''
    }) on farequote dataset with 15m bucket span`,
    groups: ['farequote', 'automated', 'single-metric'],
    analysis_config: {
      bucket_span: '15m',
      influencers: [],
      detectors: [
        {
          function: detectorFunction,
          ...(detectorField ? { field_name: detectorField } : {}),
          ...(partitionFieldName ? { partition_field_name: partitionFieldName } : {}),
        },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '10mb' },
    model_plot_config: { enabled: true },
  };

  // @ts-expect-error not full interface
  const datafeedConfig: Datafeed = {
    datafeed_id: `datafeed-fq_single_1_smv_lra_${postFix}`,
    indices: ['ft_farequote'],
    job_id: jobId,
    query: { bool: { must: [{ match_all: {} }] } },
  };

  return { jobConfig, datafeedConfig };
}

interface TestData {
  jobConfig: Job;
  datafeedConfig: Datafeed;
  analysisType: LogRateAnalysisType;
  dataGenerator: LogRateAnalysisDataGenerator;
  entitySelectionField?: string;
  entitySelectionValue?: string;
  expected: {
    anomalyTableLogRateAnalysisButtonAvailable: boolean;
    analysisResults?: Array<{
      fieldName: string;
      fieldValue: string;
      impact: string;
      logRate: string;
      pValue: string;
    }>;
  };
}

const testData: TestData[] = [
  {
    ...getJobWithDataFeed('count'),
    analysisType: 'spike',
    dataGenerator: 'farequote_with_spike',
    expected: {
      anomalyTableLogRateAnalysisButtonAvailable: true,
      analysisResults: [
        {
          fieldName: 'airline',
          fieldValue: 'AAL',
          impact: 'High',
          logRate: 'Chart type:bar chart',
          pValue: '8.96e-49',
        },
      ],
    },
  },
  {
    ...getJobWithDataFeed('high_count', undefined, 'airline'),
    analysisType: 'spike',
    dataGenerator: 'farequote_with_spike',
    entitySelectionField: 'airline',
    entitySelectionValue: 'AAL',
    expected: {
      anomalyTableLogRateAnalysisButtonAvailable: true,
    },
  },
  {
    ...getJobWithDataFeed('mean', 'responsetime'),
    analysisType: 'spike',
    dataGenerator: 'farequote_with_spike',
    expected: {
      anomalyTableLogRateAnalysisButtonAvailable: false,
    },
  },
];

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const testSubjects = getService('testSubjects');
  const comboBox = getService('comboBox');
  const aiops = getService('aiops');
  const ml = getService('ml');

  describe('anomaly table with link to log rate analysis', async function () {
    this.tags(['ml']);

    for (const td of testData) {
      const {
        jobConfig,
        datafeedConfig,
        analysisType,
        dataGenerator,
        entitySelectionField,
        entitySelectionValue,
        expected,
      } = td;
      describe(`with single metric viewer job ${jobConfig.job_id}`, async function () {
        before(async () => {
          await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
          await ml.testResources.createDataViewIfNeeded('ft_farequote', '@timestamp');
          await ml.testResources.setKibanaTimeZoneToUTC();

          await ml.api.createAndRunAnomalyDetectionLookbackJob(jobConfig, datafeedConfig);

          await ml.securityUI.loginAsMlPowerUser();
        });

        after(async () => {
          await ml.api.cleanMlIndices();
          await ml.testResources.deleteDataViewByTitle('ft_farequote');
        });

        it(`should load the single metric viewer for job '${jobConfig.job_id}`, async () => {
          await ml.testExecution.logTestStep('navigate to job list');
          await ml.navigation.navigateToMl();
          await ml.navigation.navigateToJobManagement();

          await ml.testExecution.logTestStep('open job in single metric viewer');
          await ml.jobTable.filterWithSearchString(jobConfig.job_id, 1);

          await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobConfig.job_id);
          await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

          if (entitySelectionField && entitySelectionValue) {
            await testSubjects.existOrFail(
              `mlSingleMetricViewerEntitySelection ${entitySelectionField}`
            );
            await comboBox.set(
              `mlSingleMetricViewerEntitySelection ${entitySelectionField} > comboBoxInput`,
              entitySelectionValue
            );
          }

          await ml.testExecution.logTestStep('displays the anomalies table');
          await ml.anomaliesTable.assertTableExists();

          await ml.testExecution.logTestStep('anomalies table is not empty');
          await ml.anomaliesTable.assertTableNotEmpty();
        });

        if (expected.anomalyTableLogRateAnalysisButtonAvailable) {
          it('should click the log rate analysis action', async () => {
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
            await ml.anomaliesTable.scrollRowIntoView(0);
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);
            await ml.anomaliesTable.assertAnomalyActionLogRateAnalysisButtonExists(0);
            await ml.anomaliesTable.ensureAnomalyActionLogRateAnalysisButtonClicked(0);
          });

          const shouldHaveResults = expected.analysisResults !== undefined;

          it('should complete the analysis', async () => {
            await aiops.logRateAnalysisPage.assertAnalysisComplete(
              analysisType,
              dataGenerator,
              !shouldHaveResults
            );
          });

          if (shouldHaveResults) {
            it('should show analysis results', async () => {
              await aiops.logRateAnalysisResultsTable.assertLogRateAnalysisResultsTableExists();
              const actualAnalysisTable =
                await aiops.logRateAnalysisResultsTable.parseAnalysisTable();

              expect(actualAnalysisTable).to.be.eql(
                expected.analysisResults,
                `Expected analysis table to be ${JSON.stringify(
                  expected.analysisResults
                )}, got ${JSON.stringify(actualAnalysisTable)}`
              );
            });
          }
        } else {
          it('should not show the log rate analysis action', async () => {
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
            await ml.anomaliesTable.scrollRowIntoView(0);
            await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);
            await ml.anomaliesTable.assertAnomalyActionLogRateAnalysisButtonNotExists(0);
          });
        }
      });
    }
  });
}
