/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';
import { CspSecurityCommonProvider } from './helper/user_roles_utilites';

// eslint-disable-next-line import/no-default-export
export default function (providerContext: FtrProviderContext) {
  const { loadTestFile } = providerContext;
  const cspSecurity = CspSecurityCommonProvider(providerContext);
  describe('Cloud Security Posture', function () {
    before(async () => {
      await cspSecurity.createRoles();
      await cspSecurity.createUsers();
    });

    loadTestFile(require.resolve('../telemetry/telemetry.ts'));
    loadTestFile(require.resolve('./vulnerabilities_dashboard.ts'));
    loadTestFile(require.resolve('./stats.ts'));
    loadTestFile(require.resolve('./csp_benchmark_rules_bulk_update.ts'));
    loadTestFile(require.resolve('./csp_benchmark_rules_get_states.ts'));
    loadTestFile(require.resolve('./benchmarks.ts'));
    loadTestFile(require.resolve('./status.ts'));
    loadTestFile(require.resolve('./get_detection_engine_alerts_count_by_rule_tags'));
  });
}
