/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  // AIOps / Log Rate Analysis lives in the ML UI so we need some related services.
  const ml = getService('ml');

  describe('aiops', function () {
    this.tags(['skipFirefox', 'aiops']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
    });

    after(async () => {
      // NOTE: Logout needs to happen before anything else to avoid flaky behavior
      await ml.securityUI.logout();

      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();

      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./log_rate_analysis'));
    loadTestFile(require.resolve('./log_rate_analysis_anomaly_table'));
    loadTestFile(require.resolve('./log_rate_analysis_dashboard_embeddable'));
    loadTestFile(require.resolve('./change_point_detection'));
    loadTestFile(require.resolve('./change_point_detection_dashboard'));
    loadTestFile(require.resolve('./change_point_detection_cases'));
    loadTestFile(require.resolve('./log_pattern_analysis'));
    loadTestFile(require.resolve('./log_pattern_analysis_in_discover'));
  });
}
