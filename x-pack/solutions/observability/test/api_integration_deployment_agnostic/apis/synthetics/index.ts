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
    // create_monitor_public_api_private_location migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_monitor_public_api_private_location.spec.ts
    // create_monitor_public_api migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_monitor_public_api.spec.ts
    // create_monitor test suite migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_monitor.spec.ts
    // (create_monitor.ts is retained as a helpers-only module: addMonitorAPIHelper/omitMonitorKeys are still used by unmigrated FTR suites)
    // create_update_delete_params migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_update_delete_params.spec.ts
    loadTestFile(require.resolve('./delete_monitor_project'));
    // delete_monitor migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/delete_monitor.spec.ts
    // edit_monitor_private_location migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_monitor_private_location.spec.ts
    // edit_monitor_public_api_private_location migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_monitor_public_api_private_location.spec.ts
    // edit_monitor_public_api migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_monitor_public_api.spec.ts
    // edit_monitor migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_monitor.spec.ts
    loadTestFile(require.resolve('./enable_default_alerting'));
    // get_filters migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/get_filters.spec.ts
    loadTestFile(require.resolve('./get_monitor_project'));
    // get_monitor migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/get_monitor.spec.ts
    loadTestFile(require.resolve('./inspect_monitor'));
    // suggestions migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/suggestions.spec.ts
    loadTestFile(require.resolve('./sync_global_params'));
    // sync_global_params_for_filtered_monitors migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/sync_global_params_for_filtered_monitors.spec.ts
    // synthetics_enablement migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/synthetics_enablement.spec.ts
    // test_now_monitor migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/test_now_monitor.spec.ts
    // edit_private_location migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_private_location.spec.ts
    // get_private_location_monitors migrated to Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/get_private_location_monitors.spec.ts
    loadTestFile(require.resolve('./reset_monitor'));
    loadTestFile(require.resolve('./reset_monitor_bulk'));
    loadTestFile(require.resolve('./clean_up_extra_package_policies'));
    loadTestFile(require.resolve('./migrate_legacy_policies'));
  });
}
