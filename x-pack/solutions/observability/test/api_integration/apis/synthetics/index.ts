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

    // The remaining specs are blocked from Scout migration by
    // https://github.com/elastic/kibana/issues/258046: they assert the full
    // generated Fleet package-policy via the `comparePolicies` /
    // `getTestSyntheticsPolicy` sample-data helpers and rely on the legacy
    // `${monitorId}-${locationId}-${spaceId}` package-policy id format. Their
    // Scout counterparts (`add_monitor_private_location.spec.ts`,
    // `sync_global_params.spec.ts`, `create_monitor_private_location.spec.ts`)
    // are partially ported / `describe.skip`; remove these once #258046 is
    // resolved and the sample-data comparison is ported to Scout.
    loadTestFile(require.resolve('./add_monitor_private_location'));
    loadTestFile(require.resolve('./sync_global_params'));
    loadTestFile(require.resolve('./sync_global_params_spaces'));
  });
}
