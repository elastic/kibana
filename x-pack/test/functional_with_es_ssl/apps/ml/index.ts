/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const ml = getService('ml');
  const esArchiver = getService('esArchiver');

  describe('ML app', function () {
    this.tags(['mlqa', 'skipFirefox']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.testResources.deleteIndexPatternByTitle('ft_ecommerce');
      await esArchiver.unload('x-pack/test/functional/es_archives/ml/ecommerce');
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./alert_flyout'));
  });
};
