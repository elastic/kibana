/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ServerlessRoleName } from '../../../../shared/lib/security/types';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');
  const svlMl = getService('svlMl');
  const PageObjects = getPageObjects(['svlCommonPage']);
  const dfaJobId = 'iph_outlier_permission';

  describe('Data frame analytics jobs list', function () {
    // Error: Failed to delete all indices with pattern [.ml-*]
    this.tags(['failsOnMKI']);
    before(async () => {
      await PageObjects.svlCommonPage.loginWithRole(ServerlessRoleName.PLATFORM_ENGINEER);

      await esArchiver.loadIfNeeded('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await ml.testResources.createDataViewIfNeeded('ft_ihp_outlier', '@timestamp');

      await ml.api.createDataFrameAnalyticsJob(
        ml.commonConfig.getDFAIhpOutlierDetectionJobConfig(dfaJobId)
      );
    });

    after(async () => {
      await ml.api.cleanMlIndices();
      await ml.testResources.cleanMLSavedObjects();
    });

    describe('page navigation', () => {
      it('renders job list and finds created job', async () => {
        await ml.testExecution.logTestStep('should load the DFA job management page');
        await svlMl.navigation.security.navigateToDataFrameAnalytics();

        await ml.testExecution.logTestStep('should display the stats bar and the analytics table');
        await ml.dataFrameAnalytics.assertAnalyticsStatsBarExists();
        await ml.dataFrameAnalytics.assertAnalyticsTableExists();

        await ml.testExecution.logTestStep('should display an enabled "Create job" button');
        await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonExists();
        await ml.dataFrameAnalytics.assertCreateNewAnalyticsButtonEnabled(true);

        await ml.testExecution.logTestStep('should display the DFA job in the list');
        await ml.dataFrameAnalyticsTable.filterWithSearchString(dfaJobId, 1);
      });
    });
  });
}
