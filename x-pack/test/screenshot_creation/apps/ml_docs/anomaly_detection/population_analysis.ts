/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import { FtrProviderContext } from '../../../ftr_provider_context';

import { LOGS_INDEX_PATTERN } from '..';

export default function ({ getService }: FtrProviderContext) {
  const elasticChart = getService('elasticChart');
  const ml = getService('ml');
  const mlScreenshots = getService('mlScreenshots');
  const testSubjects = getService('testSubjects');

  const screenshotDirectories = ['ml_docs', 'anomaly_detection'];

  const populationJobConfig = {
    job_id: `population`,
    analysis_config: {
      bucket_span: '15m',
      influencers: ['clientip'],
      detectors: [
        {
          function: 'mean',
          field_name: 'bytes',
          over_field_name: 'clientip',
        },
      ],
    },
    data_description: { time_field: 'timestamp', time_format: 'epoch_ms' },
    custom_settings: { created_by: 'population-wizard' },
  };

  const populationDatafeedConfig = {
    datafeed_id: 'datafeed-population',
    indices: [LOGS_INDEX_PATTERN],
    job_id: 'population',
    query: { bool: { must: [{ match_all: {} }] } },
  };

  const cellSize = 15;
  const viewBySwimLaneTestSubj = 'mlAnomalyExplorerSwimlaneViewBy';

  describe('population analysis', function () {
    before(async () => {
      await ml.api.createAndRunAnomalyDetectionLookbackJob(
        populationJobConfig as Job,
        populationDatafeedConfig as Datafeed
      );
    });

    after(async () => {
      await elasticChart.setNewChartUiDebugFlag(false);
      await ml.api.deleteAnomalyDetectionJobES(populationJobConfig.job_id);
      await ml.api.cleanMlIndices();
    });

    it('wizard screenshot', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();

      await ml.testExecution.logTestStep('open job in wizard');
      await ml.jobTable.filterWithSearchString(populationJobConfig.job_id, 1);
      await ml.jobTable.clickCloneJobAction(populationJobConfig.job_id);
      await ml.jobTypeSelection.assertPopulationJobWizardOpen();

      await ml.testExecution.logTestStep('continue to the pick fields step and take screenshot');
      await ml.jobWizardCommon.advanceToPickFieldsSection();
      await mlScreenshots.removeFocusFromElement();
      await mlScreenshots.takeScreenshot('ml-population-job', screenshotDirectories);
    });

    it('anomaly explorer screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(populationJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(populationJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();

      await ml.testExecution.logTestStep('open tooltip and take screenshot');
      const viewBySwimLanes = await testSubjects.find(viewBySwimLaneTestSubj);
      const cells = await ml.swimLane.getCells(viewBySwimLaneTestSubj);
      const sampleCell = cells[0];

      await viewBySwimLanes.moveMouseTo({
        xOffset: Math.floor(cellSize / 2.0),
        yOffset: Math.floor(cellSize / 2.0),
      });

      await mlScreenshots.takeScreenshot('ml-population-results', screenshotDirectories);

      await ml.testExecution.logTestStep(
        'select swim lane tile, expand anomaly row and take screenshot'
      );
      await ml.swimLane.selectSingleCell(viewBySwimLaneTestSubj, {
        x: sampleCell.x + cellSize,
        y: sampleCell.y + cellSize,
      });
      await ml.swimLane.waitForSwimLanesToLoad();

      await ml.anomalyExplorer.scrollChartsContainerIntoView();
      await ml.anomaliesTable.ensureDetailsOpen(0);
      await ml.testExecution.logTestStep('take screenshot');
      await mlScreenshots.takeScreenshot('ml-population-anomaly', screenshotDirectories);
    });
  });
}
