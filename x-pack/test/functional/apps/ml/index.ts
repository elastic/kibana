/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning', function () {
    this.tags('ciGroup3');

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.testResources.deleteSavedSearches();
      await ml.testResources.deleteDashboards();

      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_ecommerce');
      await ml.testResources.deleteIndexPatternByTitle('ft_categorization');
      await ml.testResources.deleteIndexPatternByTitle('ft_event_rate_gen_trend_nanos');
      await ml.testResources.deleteIndexPatternByTitle('ft_bank_marketing');
      await ml.testResources.deleteIndexPatternByTitle('ft_ihp_outlier');
      await ml.testResources.deleteIndexPatternByTitle('ft_egs_regression');

      await esArchiver.unload('ml/farequote');
      await esArchiver.unload('ml/ecommerce');
      await esArchiver.unload('ml/categorization');
      await esArchiver.unload('ml/event_rate_nanos');
      await esArchiver.unload('ml/bm_classification');
      await esArchiver.unload('ml/ihp_outlier');
      await esArchiver.unload('ml/egs_regression');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./feature_controls'));
    loadTestFile(require.resolve('./pages'));
    loadTestFile(require.resolve('./anomaly_detection'));
    loadTestFile(require.resolve('./data_visualizer'));
    loadTestFile(require.resolve('./data_frame_analytics'));
  });
}
