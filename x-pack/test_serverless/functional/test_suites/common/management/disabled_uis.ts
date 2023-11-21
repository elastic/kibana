/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObject, getService }: FtrProviderContext) {
  const commonPage = getPageObject('common');
  const testSubjects = getService('testSubjects');

  // Flaky in serverless tests
  describe.skip('Disabled UIs', function () {
    const DISABLED_PLUGINS = [
      {
        appName: 'Upgrade Assistant',
        url: 'stack/upgrade_assistant',
      },
      {
        appName: 'Advanced Settings',
        url: 'kibana/settings',
      },
      {
        appName: 'Migrate',
        url: 'data/migrate_data',
      },
      {
        appName: 'Remote Clusters',
        url: 'data/remote_clusters',
      },
      {
        appName: 'Cross-Cluster Replication',
        url: 'data/cross_cluster_replication',
      },
      {
        appName: 'Snapshot and Restore',
        url: 'data/snapshot_restore',
      },
      {
        appName: 'Index Lifecycle Management',
        url: 'data/index_lifecycle_management',
      },
      {
        appName: 'Rollup Jobs',
        url: 'data/rollup_jobs',
      },
      {
        appName: 'License Management',
        url: 'stack/license_management',
      },
      {
        appName: 'Watcher',
        url: 'insightsAndAlerting/watcher',
      },
      {
        appName: 'Users',
        url: 'security/users',
      },
      {
        appName: 'Roles',
        url: 'security/roles',
      },
      {
        appName: 'Role Mappings',
        url: 'security/role_mappings',
      },
    ];

    DISABLED_PLUGINS.forEach(({ appName, url }) => {
      it(`${appName} is not accessible`, async () => {
        await commonPage.navigateToUrl('management', url, {
          shouldUseHashForSubUrl: false,
        });
        // If the route doesn't exist, the user will be redirected back to the Management landing page
        await testSubjects.exists('managementHome');
      });
    });
  });
}
