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
  const commonScreenshots = getService('commonScreenshots');

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

    it('anomaly explorer screenshots', async () => {
      await ml.testExecution.logTestStep('navigate to job list');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToJobManagement();
      await elasticChart.setNewChartUiDebugFlag(true);

      await ml.testExecution.logTestStep('open job in anomaly explorer');
      await ml.jobTable.filterWithSearchString(populationJobConfig.job_id, 1);
      await ml.jobTable.clickOpenJobInAnomalyExplorerButton(populationJobConfig.job_id);
      await ml.commonUI.waitForMlLoadingIndicatorToDisappear();
      await commonScreenshots.takeScreenshot('influencers', screenshotDirectories);
    });
  });
}
