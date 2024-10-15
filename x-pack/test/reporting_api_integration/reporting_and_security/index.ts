/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, loadTestFile }: FtrProviderContext) {
  describe('Reporting APIs', function () {
    this.tags('ciGroup2');

    const esVersion = getService('esVersion');

    before(async () => {
      const reportingAPI = getService('reportingAPI');
      if (esVersion.matchRange('<=7')) {
        await reportingAPI.logTaskManagerHealth();
      }

      await reportingAPI.createDataAnalystRole();
      await reportingAPI.createTestReportingUserRole();
      await reportingAPI.createDataAnalyst();
      await reportingAPI.createTestReportingUser();
    });

    loadTestFile(require.resolve('./bwc_generation_urls')); // 7.x only
    loadTestFile(require.resolve('./bwc_existing_indexes'));
    loadTestFile(require.resolve('./security_roles_privileges'));
    loadTestFile(require.resolve('./download_csv_dashboard'));
    loadTestFile(require.resolve('./generate_csv_discover'));
    loadTestFile(require.resolve('./generate_csv_discover_deprecated'));
    loadTestFile(require.resolve('./csv_saved_search'));
    loadTestFile(require.resolve('./network_policy'));
    loadTestFile(require.resolve('./spaces'));
    loadTestFile(require.resolve('./usage'));
    loadTestFile(require.resolve('./ilm_migration_apis'));
    loadTestFile(require.resolve('./search_frozen_indices'));
  });
}
