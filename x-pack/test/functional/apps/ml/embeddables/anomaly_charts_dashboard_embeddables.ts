/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';

// @ts-expect-error not full interface
const JOB_CONFIG: Job = {
  job_id: `fq_multi_1_ae`,
  description:
    'mean/min/max(responsetime) partition=airline on farequote dataset with 1h bucket span',
  groups: ['farequote', 'automated', 'multi-metric'],
  analysis_config: {
    bucket_span: '1h',
    influencers: ['airline'],
    detectors: [
      { function: 'mean', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'min', field_name: 'responsetime', partition_field_name: 'airline' },
      { function: 'max', field_name: 'responsetime', partition_field_name: 'airline' },
    ],
  },
  data_description: { time_field: '@timestamp' },
  analysis_limits: { model_memory_limit: '20mb' },
  model_plot_config: { enabled: true },
};

// @ts-expect-error not full interface
const DATAFEED_CONFIG: Datafeed = {
  datafeed_id: 'datafeed-fq_multi_1_ae',
  indices: ['ft_farequote'],
  job_id: 'fq_multi_1_ae',
  query: { bool: { must: [{ match_all: {} }] } },
};

const testDataList = [
  {
    suiteSuffix: 'with multi metric job',
    panelTitle: `ML anomaly charts for ${JOB_CONFIG.job_id}`,
    jobConfig: JOB_CONFIG,
    datafeedConfig: DATAFEED_CONFIG,
    dashboardTitle: `ML anomaly charts for fq_multi_1_ae ${Date.now()}`,
    expected: {
      influencers: [
        {
          field: 'airline',
          count: 10,
          labelsContained: ['AAL'],
        },
      ],
    },
  },
];

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const PageObjects = getPageObjects(['common', 'timePicker', 'dashboard']);

  describe('anomaly charts in dashboard', function () {
    this.tags(['mlqa']);

    before(async () => {
      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/farequote');
      await ml.testResources.createIndexPatternIfNeeded('ft_farequote', '@timestamp');
      await ml.testResources.setKibanaTimeZoneToUTC();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.api.cleanMlIndices();
    });

    for (const testData of testDataList) {
      describe(testData.suiteSuffix, function () {
        before(async () => {
          await ml.api.createAndRunAnomalyDetectionLookbackJob(
            testData.jobConfig,
            testData.datafeedConfig
          );
          await PageObjects.common.navigateToApp('dashboard');
        });

        it('can open job selection flyout', async () => {
          await PageObjects.dashboard.clickNewDashboard();
          await ml.dashboardEmbeddables.assertDashboardIsEmpty();
          await ml.dashboardEmbeddables.openJobSelectionFlyout();
        });

        it('can select jobs', async () => {
          await ml.dashboardJobSelectionTable.setRowCheckboxState(testData.jobConfig.job_id, true);
          await ml.dashboardJobSelectionTable.applyJobSelection();
          await ml.dashboardEmbeddables.assertAnomalyChartsEmbeddableInitializerExists();
          await ml.dashboardEmbeddables.assertSelectMaxSeriesToPlotValue(6);
        });

        it('create new anomaly charts panel', async () => {
          await ml.dashboardEmbeddables.clickInitializerConfirmButtonEnabled();
          await ml.dashboardEmbeddables.assertDashboardPanelExists(testData.panelTitle);

          await ml.dashboardEmbeddables.assertNoMatchingAnomaliesMessageExists();

          await PageObjects.timePicker.setAbsoluteRange(
            'Feb 7, 2016 @ 00:00:00.000',
            'Feb 11, 2016 @ 00:00:00.000'
          );
          await PageObjects.timePicker.pauseAutoRefresh();
          await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
          await ml.dashboardEmbeddables.assertAnomalyChartsExists();
          await PageObjects.dashboard.saveDashboard(testData.dashboardTitle);
        });
      });
    }

    describe('supports migrations', function () {
      const panelTitle = `Saved ML anomaly charts for fq_multi_1_ae`;
      const dashboardSavedObject = {
        attributes: {
          title: `ML anomaly charts 7.15 dashboard ${Date.now()}`,
          description: '',
          panelsJSON: `[{"version":"7.15.2","type":"ml_anomaly_charts","gridData":{"x":0,"y":0,"w":36,"h":20,"i":"ffcdb1ed-0079-41ee-8dda-3f6c138182ab"},"panelIndex":"ffcdb1ed-0079-41ee-8dda-3f6c138182ab","embeddableConfig":{"jobIds":["fq_multi_1_ae"],"maxSeriesToPlot":6,"severityThreshold":0,"enhancements":{}},"title":"${panelTitle}"}]`,
          optionsJSON: '{"useMargins":true,"syncColors":false,"hidePanelTitles":false}',
          timeRestore: true,
          timeTo: '2016-02-11T00:00:00.000Z',
          timeFrom: '2016-02-07T00:00:00.000Z',
          refreshInterval: {
            pause: true,
            value: 0,
          },
          kibanaSavedObjectMeta: {
            searchSourceJSON: '{"query":{"query":"","language":"kuery"},"filter":[]}',
          },
        },
        coreMigrationVersion: '7.15.2',
      };

      before(async () => {
        await ml.testResources.createDashboardSavedObject(
          dashboardSavedObject.attributes.title,
          dashboardSavedObject
        );
        await PageObjects.common.navigateToApp('dashboard');
      });

      it('loads saved dashboard from version 7.15', async () => {
        await PageObjects.dashboard.loadSavedDashboard(dashboardSavedObject.attributes.title);
        await ml.dashboardEmbeddables.assertDashboardPanelExists(panelTitle);
        await PageObjects.timePicker.setAbsoluteRange(
          'Feb 7, 2016 @ 00:00:00.000',
          'Feb 11, 2016 @ 00:00:00.000'
        );
        await PageObjects.timePicker.pauseAutoRefresh();
        await ml.dashboardEmbeddables.assertAnomalyChartsSeverityThresholdControlExists();
        await ml.dashboardEmbeddables.assertAnomalyChartsExists();
      });
    });
  });
}
