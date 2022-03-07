/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';
import { Job, Datafeed } from '../../../../../plugins/ml/common/types/anomaly_detection_jobs';
import { ML_JOB_FIELD_TYPES } from '../../../../../plugins/ml/common/constants/field_types';

import { ECOMMERCE_INDEX_PATTERN, LOGS_INDEX_PATTERN } from '../index';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const maps = getPageObject('maps');
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');
  const renderable = getService('renderable');

  const screenshotDirectories = ['ml_docs', 'anomaly_detection'];

  const ecommerceGeoJobConfig = {
    job_id: `ecommerce-geo`,
    analysis_config: {
      bucket_span: '15m',
      influencers: ['geoip.country_iso_code', 'day_of_week', 'category.keyword', 'user'],
      detectors: [
        {
          detector_description: 'Unusual coordinates by user',
          function: 'lat_long',
          field_name: 'geoip.location',
          by_field_name: 'user',
        },
      ],
    },
    data_description: { time_field: 'order_date' },
  };

  const ecommerceGeoDatafeedConfig = {
    datafeed_id: 'datafeed-ecommerce-geo',
    indices: [ECOMMERCE_INDEX_PATTERN],
    job_id: 'ecommerce-geo',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const weblogGeoJobConfig = {
    job_id: `weblogs-geo`,
    analysis_config: {
      bucket_span: '15m',
      influencers: ['geo.src', 'extension.keyword', 'geo.dest'],
      detectors: [
        {
          detector_description: 'Unusual coordinates',
          function: 'lat_long',
          field_name: 'geo.coordinates',
        },
        {
          function: 'high_sum',
          field_name: 'bytes',
        },
      ],
    },
    data_description: { time_field: 'timestamp', time_format: 'epoch_ms' },
  };

  const weblogGeoDatafeedConfig = {
    datafeed_id: 'datafeed-weblogs-geo',
    indices: [LOGS_INDEX_PATTERN],
    job_id: 'weblogs-geo',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const cellSize = 15;
  const overallSwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneOverall';

  describe('geographic data', function () {
    before(async () => {
      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        ecommerceGeoJobConfig as Job,
        ecommerceGeoDatafeedConfig as Datafeed
      );
      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        weblogGeoJobConfig as Job,
        weblogGeoDatafeedConfig as Datafeed
      );
    });

    after(async () => {
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.api.deleteAnomalyDetectionJobES(ecommerceGeoJobConfig.job_id);
      await ml.api.deleteAnomalyDetectionJobES(weblogGeoJobConfig.job_id);
      await ml.api.cleanMlIndices();
    });

    it('data visualizer screenshot', async () => {
      await ml.testExecution.logTestStep('open index in data visualizer');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToDataVisualizer();
      await ml.dataVisualizer.navigateToIndexPatternSelection();
      await ml.jobSourceSelection.selectSourceForIndexBasedDataVisualizer(LOGS_INDEX_PATTERN);

      await ml.testExecution.logTestStep('set data visualizer options');
      await ml.dataVisualizerIndexBased.assertTimeRangeSelectorSectionExists();
      await ml.dataVisualizerIndexBased.clickUseFullDataButton('14,074');
      await ml.dataVisualizerTable.setSampleSizeInputValue(
        'all',
        'geo.coordinates',
        '14074 (100%)'
      );
      await ml.dataVisualizerTable.setFieldTypeFilter([ML_JOB_FIELD_TYPES.GEO_POINT]);

      await ml.testExecution.logTestStep('set maps options and take screenshot');
      await ml.dataVisualizerTable.ensureDetailsOpen('geo.coordinates');
      await renderable.waitForRender();

      // setView only works with displayed legend
      await maps.openLegend();
      await maps.setView(44.1, -68.9, 4.5);
      await maps.closeLegend();

      await mlScreenshots.takeScreenshot('weblogs-data-visualizer-geopoint', screenshotDirectories);
    });

    it('ecommerce wizard screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('load the advanced wizard');
      await ml.jobManagement.navigateToNewJobSourceSelection();
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(ECOMMERCE_INDEX_PATTERN);
      await ml.jobTypeSelection.selectAdvancedJob();

      await ml.testExecution.logTestStep('continue to the pick fields step');
      await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('add detector');
      await ml.jobWizardAdvanced.openCreateDetectorModal();
      await ml.jobWizardAdvanced.selectDetectorFunction('lat_long');
      await ml.jobWizardAdvanced.selectDetectorField('geoip.location');
      await ml.jobWizardAdvanced.selectDetectorByField('user');
      await ml.jobWizardAdvanced.confirmAddDetectorModal();

      await ml.testExecution.logTestStep('set the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan('15m');

      await ml.testExecution.logTestStep('set influencers');
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([]);
      for (const influencer of ['geoip.country_iso_code', 'day_of_week', 'category.keyword']) {
        await ml.jobWizardCommon.addInfluencer(influencer);
      }

      await ml.testExecution.logTestStep('set the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
        withAdvancedSection: false,
      });
      await ml.jobWizardCommon.setModelMemoryLimit('12MB', {
        withAdvancedSection: false,
      });

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot(
        'ecommerce-advanced-wizard-geopoint',
        screenshotDirectories
      );
    });

    it('weblogs wizard screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('load the advanced wizard');
      await ml.jobManagement.navigateToNewJobSourceSelection();
      await ml.jobSourceSelection.selectSourceForAnomalyDetectionJob(LOGS_INDEX_PATTERN);
      await ml.jobTypeSelection.selectAdvancedJob();

      await ml.testExecution.logTestStep('continue to the pick fields step');
      await ml.jobWizardCommon.assertConfigureDatafeedSectionExists();
      await ml.jobWizardCommon.advanceToPickFieldsSection();

      await ml.testExecution.logTestStep('add detectors');
      await ml.jobWizardAdvanced.openCreateDetectorModal();
      await ml.jobWizardAdvanced.selectDetectorFunction('lat_long');
      await ml.jobWizardAdvanced.selectDetectorField('geo.coordinates');
      await ml.jobWizardAdvanced.setDetectorDescription('lat_long("geo.coordinates")');
      await ml.jobWizardAdvanced.confirmAddDetectorModal();

      await ml.jobWizardAdvanced.openCreateDetectorModal();
      await ml.jobWizardAdvanced.selectDetectorFunction('high_sum');
      await ml.jobWizardAdvanced.selectDetectorField('bytes');
      await ml.jobWizardAdvanced.setDetectorDescription('sum(bytes)');
      await ml.jobWizardAdvanced.confirmAddDetectorModal();

      await ml.testExecution.logTestStep('set the bucket span');
      await ml.jobWizardCommon.assertBucketSpanInputExists();
      await ml.jobWizardCommon.setBucketSpan('15m');

      await ml.testExecution.logTestStep('set influencers');
      await ml.jobWizardCommon.assertInfluencerInputExists();
      await ml.jobWizardCommon.assertInfluencerSelection([]);
      for (const influencer of ['geo.src', 'geo.dest', 'extension.keyword']) {
        await ml.jobWizardCommon.addInfluencer(influencer);
      }

      await ml.testExecution.logTestStep('set the model memory limit');
      await ml.jobWizardCommon.assertModelMemoryLimitInputExists({
        withAdvancedSection: false,
      });
      await ml.jobWizardCommon.setModelMemoryLimit('11MB', {
        withAdvancedSection: false,
      });

      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('weblogs-advanced-wizard-geopoint', screenshotDirectories);
    });

    // the job stopped to produce an anomaly, needs investigation
    it.skip('ecommerce anomaly explorer screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(ecommerceGeoJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(ecommerceGeoJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('select swim lane tile');
      const cells = await ml.swimLane.getCells(overallSwimLaneTestSubj);
      const sampleCell = cells[0];
      await ml.swimLane.selectSingleCell(overallSwimLaneTestSubj, {
        x: sampleCell.x + cellSize,
        y: sampleCell.y + cellSize,
      });
      await ml.swimLane.waitForSwimLanesToLoad();

      await ml.testExecution.logTestStep('take screenshot');
      await ml.anomaliesTable.ensureDetailsOpen(0);
      await ml.anomalyExplorer.scrollChartsContainerIntoView();

      await mlScreenshots.takeScreenshot(
        'ecommerce-anomaly-explorer-geopoint',
        screenshotDirectories
      );
    });

    it('weblogs anomaly explorer screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(weblogGeoJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(weblogGeoJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('select swim lane tile');
      const cells = await ml.swimLane.getCells(overallSwimLaneTestSubj);
      const sampleCell1 = cells[11];
      const sampleCell2 = cells[cells.length - 1];
      await ml.swimLane.selectCells(overallSwimLaneTestSubj, {
        x1: sampleCell1.x + cellSize,
        y1: sampleCell1.y + cellSize,
        x2: sampleCell2!.x + cellSize,
        y2: sampleCell2!.y + cellSize,
      });
      await ml.swimLane.waitForSwimLanesToLoad();

      await ml.testExecution.logTestStep('set map options and take screenshot');
      await ml.anomalyExplorer.scrollChartsContainerIntoView();

      // clickFitToData only works with displayed legend
      await maps.openLegend();
      await maps.clickFitToData();
      await ml.anomalyExplorer.scrollChartsContainerIntoView();
      await maps.closeLegend();

      await mlScreenshots.takeScreenshot(
        'weblogs-anomaly-explorer-geopoint',
        screenshotDirectories
      );
    });
  });
}
