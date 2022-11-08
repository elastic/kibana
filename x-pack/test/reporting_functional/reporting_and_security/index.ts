/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('Reporting Functional Tests with Security enabled', function () {
    this.tags('ciGroup2');

    before(async () => {
      const reportingFunctional = getService('reportingFunctional');
      await reportingFunctional.logTaskManagerHealth();
      await reportingFunctional.createDataAnalystRole();
      await reportingFunctional.createDataAnalyst();
      await reportingFunctional.createTestReportingUserRole();
      await reportingFunctional.createTestReportingUser();
    });

    loadTestFile(require.resolve('./security_roles_privileges'));
    loadTestFile(require.resolve('./management'));
  });
}
