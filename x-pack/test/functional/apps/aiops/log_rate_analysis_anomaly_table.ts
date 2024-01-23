/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../ftr_provider_context';

function getJobWithDataFeed() {
  // @ts-expect-error not full interface
  const jobConfig: Job = {
    job_id: `fq_single_1_smv_lra`,
    description: 'count() on farequote dataset with 15m bucket span',
    groups: ['farequote', 'automated', 'single-metric'],
    analysis_config: {
      bucket_span: '15m',
      influencers: [],
      detectors: [
        {
          function: 'count',
        },
      ],
    },
    data_description: { time_field: '@timestamp' },
    analysis_limits: { model_memory_limit: '10mb' },
    model_plot_config: { enabled: true },
  };

  // @ts-expect-error not full interface
  const datafeedConfig: Datafeed = {
    datafeed_id: 'datafeed-fq_single_1_smv_lra',
    indices: ['ft_farequote'],
    job_id: 'fq_single_1_smv_lra',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  return { jobConfig, datafeedConfig };
}

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const aiops = getService('aiops');
  const ml = getService('ml');

  describe('anomaly table with link to log rate analysis', async function () {
    this.tags(['ml']);

    describe('with single metric job', function () {
      const { jobConfig, datafeedConfig } = getJobWithDataFeed();

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

      it('should load the single metric viewer', async () => {
        await ml.testExecution.logTestStep('navigate to job list');
        await ml.navigation.navigateToMl();
        await ml.navigation.navigateToJobManagement();

        await ml.testExecution.logTestStep('open job in single metric viewer');
        await ml.jobTable.filterWithSearchString(jobConfig.job_id, 1);

        await ml.jobTable.clickOpenJobInSingleMetricViewerButton(jobConfig.job_id);
        await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

        await ml.testExecution.logTestStep('displays the anomalies table');
        await ml.anomaliesTable.assertTableExists();

        await ml.testExecution.logTestStep('anomalies table is not empty');
        await ml.anomaliesTable.assertTableNotEmpty();
      });

      it('should click the log rate analysis action', async () => {
        await ml.anomaliesTable.assertAnomalyActionsMenuButtonExists(0);
        await ml.anomaliesTable.scrollRowIntoView(0);
        await ml.anomaliesTable.assertAnomalyActionsMenuButtonEnabled(0, true);
        await ml.anomaliesTable.assertAnomalyActionLogRateAnalaysisButtonExists(0);
        await ml.anomaliesTable.ensureAnomalyActionLogRateAnalysisButtonClicked(0);
      });

      it('should complete log rate analysis', async () => {
        await aiops.logRateAnalysisPage.assertAnalysisComplete('spike', 'farequote_with_spike');
      });

      it('should show a disabled group switch', async () => {
        await aiops.logRateAnalysisPage.assertLogRateAnalysisResultsGroupSwitchExists(false);
      });

      it('should show analysis results', async () => {
        await aiops.logRateAnalysisResultsTable.assertLogRateAnalysisResultsTableExists();
        const actualAnalysisTable = await aiops.logRateAnalysisResultsTable.parseAnalysisTable();

        expect(actualAnalysisTable).to.be.eql(
          [
            {
              fieldName: 'airline',
              fieldValue: 'AAL',
              impact: 'High',
              logRate: 'Chart type:bar chart',
              pValue: '8.96e-49',
            },
          ],
          `Expected analysis table to be ${JSON.stringify({})}, got ${JSON.stringify(
            actualAnalysisTable
          )}`
        );
      });
    });
  });
}
