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

  describe('machine learning - stack management jobs', function () {
    this.tags(['ml', 'skipFirefox']);
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
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/bm_classification');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ihp_outlier');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/egs_regression');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./synchronize'));
    loadTestFile(require.resolve('./manage_spaces'));
    loadTestFile(require.resolve('./import_jobs'));
    loadTestFile(require.resolve('./export_jobs'));
  });
}
