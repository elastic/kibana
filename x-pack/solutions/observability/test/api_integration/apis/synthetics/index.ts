/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';
import { PrivateLocationTestService } from './services/private_location_test_service';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  describe('Synthetics API Tests', () => {
    // Run Fleet setup + synthetics package install exactly once for the whole
    // suite. The underlying helper is idempotent, so every per-file
    // `installSyntheticsPackage()` call (if any remain) becomes a cheap GET.
    // This removes ~7 redundant uninstall/reinstall cycles per CI run, which
    // were a source of 502 / "backend closed connection" flakes against Fleet.
    before(async () => {
      await esDeleteAllIndices('heartbeat*');
      await esDeleteAllIndices('synthetics*');
      const privateLocationService = new PrivateLocationTestService(getService);
      await privateLocationService.installSyntheticsPackage();
    });

    loadTestFile(require.resolve('./synthetics_enablement'));
    loadTestFile(require.resolve('./add_monitor'));
    // add_monitor_project covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_monitor_project.spec.ts
    loadTestFile(require.resolve('./add_monitor_private_location'));
    // edit_monitor had no active tests (only an it.skip); covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/edit_monitor.spec.ts
    loadTestFile(require.resolve('./sync_global_params'));
    loadTestFile(require.resolve('./sync_global_params_spaces'));
    // add_edit_params covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/create_update_delete_params.spec.ts
    // list_monitors covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/list_monitors.spec.ts
    // private_location_apis covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/private_location_apis.spec.ts
    // synthetics_api_security covered by Scout: x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/synthetics_api_security.spec.ts
    // sync_maintenance_windows + sync_maintenance_windows_non_default_space migrated to Scout:
    // x-pack/solutions/observability/plugins/synthetics/test/scout/api/tests/maintenance_windows.spec.ts
  });
}
