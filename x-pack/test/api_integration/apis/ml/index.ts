/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService, loadTestFile }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const ml = getService('ml');

  describe('Machine Learning', function() {
    this.tags(['mlqa']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.testResources.deleteIndexPattern('kibana_sample_data_logs');

      await esArchiver.unload('ml/ecommerce');
      await esArchiver.unload('ml/categorization');
      await esArchiver.unload('ml/sample_logs');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./modules'));
    loadTestFile(require.resolve('./anomaly_detectors'));
    loadTestFile(require.resolve('./data_visualizer'));
    loadTestFile(require.resolve('./fields_service'));
    loadTestFile(require.resolve('./job_validation'));
    loadTestFile(require.resolve('./jobs'));
  });
}
