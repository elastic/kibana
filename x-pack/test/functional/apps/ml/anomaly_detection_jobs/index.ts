/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const config = getService('config');
  const isCcs = config.get('esTestCluster.ccs');
  const esNode = isCcs ? getService('remoteEsArchiver' as 'esArchiver') : getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - anomaly detection', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await esNode.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esNode.unload('x-pack/test/functional/es_archives/ml/ecommerce');
      await esNode.unload('x-pack/test/functional/es_archives/ml/categorization_small');
      await esNode.unload('x-pack/test/functional/es_archives/ml/event_rate_nanos');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./single_metric_job'));

    if (!isCcs) {
      loadTestFile(require.resolve('./job_expanded_details'));
      loadTestFile(require.resolve('./single_metric_job_without_datafeed_start'));
      loadTestFile(require.resolve('./multi_metric_job'));
      loadTestFile(require.resolve('./population_job'));
      loadTestFile(require.resolve('./geo_job'));
      loadTestFile(require.resolve('./saved_search_job'));
      loadTestFile(require.resolve('./advanced_job'));
      loadTestFile(require.resolve('./categorization_job'));
      loadTestFile(require.resolve('./date_nanos_job'));
      loadTestFile(require.resolve('./custom_urls'));
      loadTestFile(require.resolve('./delete_job_and_delete_annotations'));
      loadTestFile(require.resolve('./convert_single_metric_job_to_multi_metric'));
      loadTestFile(require.resolve('./convert_jobs_to_advanced_job'));
    }
  });
}
