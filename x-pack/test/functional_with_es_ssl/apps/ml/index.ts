/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const ml = getService('ml');

  describe('ML app', function () {
    this.tags(['mlqa', 'skipFirefox']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
      await ml.testResources.resetKibanaTimeZone();
      await ml.securityUI.logout();
    });

    loadTestFile(require.resolve('./alert_flyout'));
  });
};
