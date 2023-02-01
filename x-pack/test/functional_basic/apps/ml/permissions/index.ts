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

  describe('machine learning basic license - permissions', function () {
    this.tags(['skipFirefox', 'ml']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.testResources.deleteSavedSearches();

      await ml.testResources.deleteIndexPatternByTitle('ft_farequote');
      await ml.testResources.deleteIndexPatternByTitle('ft_module_sample_ecommerce');

      await esArchiver.unload('x-pack/test/functional/es_archives/ml/farequote');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/module_sample_ecommerce');

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./full_ml_access'));
    loadTestFile(require.resolve('./read_ml_access'));
    loadTestFile(require.resolve('./no_ml_access'));
  });
}
