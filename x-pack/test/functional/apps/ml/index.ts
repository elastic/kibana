/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning', function () {
    describe('', function () {
      before(async () => {
        await ml.securityCommon.createMlRoles();
        await ml.securityCommon.createMlUsers();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await ml.securityUI.logout();

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
        await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/event_rate_nanos');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');
        await ml.testResources.resetKibanaTimeZone();
      });

      describe('', function () {
        this.tags('ciGroup15');
        loadTestFile(require.resolve('./permissions'));
        loadTestFile(require.resolve('./pages'));
        loadTestFile(require.resolve('./data_visualizer'));
        loadTestFile(require.resolve('./data_frame_analytics'));
        loadTestFile(require.resolve('./model_management'));
      });

      describe('', function () {
        this.tags('ciGroup26');
        loadTestFile(require.resolve('./anomaly_detection'));
      });
    });

    describe('', function () {
      this.tags('ciGroup8');

      before(async () => {
        await ml.securityCommon.createMlRoles();
        await ml.securityCommon.createMlUsers();
      });

      after(async () => {
        // NOTE: Logout needs to happen before anything else to avoid flaky behavior
        await ml.securityUI.logout();

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
        await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/event_rate_nanos');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');
        await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');
        await ml.testResources.resetKibanaTimeZone();
      });

      loadTestFile(require.resolve('./feature_controls'));
      loadTestFile(require.resolve('./settings'));
      loadTestFile(require.resolve('./embeddables'));
      loadTestFile(require.resolve('./stack_management_jobs'));
    });
  });
}
