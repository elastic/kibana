/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - data visualizer', function () {
    this.tags(['skipFirefox', 'mlqa']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote_small');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization_small');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/event_rate_nanos');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./index_data_visualizer'));
    loadTestFile(require.resolve('./index_data_visualizer_grid_in_discover'));
    loadTestFile(require.resolve('./index_data_visualizer_grid_in_dashboard'));
    loadTestFile(require.resolve('./index_data_visualizer_actions_panel'));
    loadTestFile(require.resolve('./index_data_visualizer_index_pattern_management'));
    loadTestFile(require.resolve('./file_data_visualizer'));
  });
}
