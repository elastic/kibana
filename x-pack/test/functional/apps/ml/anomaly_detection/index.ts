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

  describe('machine learning - anomaly detection', function () {
    this.tags(['skipFirefox']);

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
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/categorization_small');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/event_rate_nanos');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./single_metric_job'));
    loadTestFile(require.resolve('./single_metric_job_without_datafeed_start'));
    loadTestFile(require.resolve('./multi_metric_job'));
    loadTestFile(require.resolve('./population_job'));
    loadTestFile(require.resolve('./saved_search_job'));
    loadTestFile(require.resolve('./advanced_job'));
    loadTestFile(require.resolve('./single_metric_viewer'));
    loadTestFile(require.resolve('./anomaly_explorer'));
    loadTestFile(require.resolve('./categorization_job'));
    loadTestFile(require.resolve('./date_nanos_job'));
    loadTestFile(require.resolve('./annotations'));
    loadTestFile(require.resolve('./aggregated_scripted_job'));
    loadTestFile(require.resolve('./custom_urls'));
    loadTestFile(require.resolve('./forecasts'));
    loadTestFile(require.resolve('./lens_to_ml'));
  });
}
