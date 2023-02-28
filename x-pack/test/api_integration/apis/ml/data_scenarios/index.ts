/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const ml = getService('ml');

  describe('Machine Learning', function () {
    this.tags(['ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();

      // ML saved objects (e.g. lang_ident_model_1) might have lost the * space
      // assignment when privious test suites loaded and unloaded the .kibana index.
      // We're making sure that it's in the expected state again.
      await ml.api.initSavedObjects();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./bucket_span_estimator'));
  });
}
