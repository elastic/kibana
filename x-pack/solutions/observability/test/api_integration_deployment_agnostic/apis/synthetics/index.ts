/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from '../../services/synthetics_private_location';

export default function ({ loadTestFile, getService }: DeploymentAgnosticFtrProviderContext) {
  describe('SyntheticsAPITests', () => {
    // Run Fleet setup + synthetics package install exactly once for the whole
    // suite. The underlying helper is idempotent, so every per-describe
    // `installSyntheticsPackage()` call inside a child test file becomes a
    // cheap GET. This removes ~24 redundant uninstall/reinstall cycles per
    // CI run, which were the primary source of 502 / "backend closed
    // connection" flakes against Fleet.
    before(async () => {
      const privateLocationService = new PrivateLocationTestService(getService);
      await privateLocationService.installSyntheticsPackage();
    });

    loadTestFile(require.resolve('./legacy_and_multispace_monitor_api'));
    loadTestFile(require.resolve('./create_monitor_private_location'));
    loadTestFile(require.resolve('./create_monitor_project_private_location'));
    loadTestFile(require.resolve('./create_monitor_project'));
    loadTestFile(require.resolve('./create_monitor_project_multi_space.ts'));
    loadTestFile(require.resolve('./create_monitor_public_api_private_location'));
    loadTestFile(require.resolve('./create_monitor_public_api'));
    loadTestFile(require.resolve('./create_monitor'));
    loadTestFile(require.resolve('./create_update_delete_params'));
    loadTestFile(require.resolve('./delete_monitor_project'));
    loadTestFile(require.resolve('./delete_monitor'));
    loadTestFile(require.resolve('./edit_monitor_private_location'));
    loadTestFile(require.resolve('./edit_monitor_public_api_private_location'));
    loadTestFile(require.resolve('./edit_monitor_public_api'));
    loadTestFile(require.resolve('./edit_monitor'));
    loadTestFile(require.resolve('./enable_default_alerting'));
    loadTestFile(require.resolve('./get_filters'));
    loadTestFile(require.resolve('./get_monitor_project'));
    loadTestFile(require.resolve('./get_monitor'));
    loadTestFile(require.resolve('./inspect_monitor'));
    loadTestFile(require.resolve('./suggestions.ts'));
    loadTestFile(require.resolve('./sync_global_params'));
    loadTestFile(require.resolve('./sync_global_params_for_filtered_monitors'));
    loadTestFile(require.resolve('./synthetics_enablement'));
    loadTestFile(require.resolve('./test_now_monitor'));
    loadTestFile(require.resolve('./edit_private_location'));
    loadTestFile(require.resolve('./get_private_location_monitors'));
    loadTestFile(require.resolve('./reset_monitor'));
    loadTestFile(require.resolve('./reset_monitor_bulk'));
    loadTestFile(require.resolve('./clean_up_extra_package_policies'));
    loadTestFile(require.resolve('./migrate_legacy_policies'));
  });
}
