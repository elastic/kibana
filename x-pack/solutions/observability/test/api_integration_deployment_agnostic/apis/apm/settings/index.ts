/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('settings', () => {
    loadTestFile(require.resolve('./agent_keys/agent_keys.spec.ts'));
    loadTestFile(require.resolve('./anomaly_detection/basic.spec.ts'));
    loadTestFile(require.resolve('./anomaly_detection/read_user.spec.ts'));
    loadTestFile(require.resolve('./anomaly_detection/update_to_v3.spec.ts'));
    loadTestFile(require.resolve('./anomaly_detection/write_user.spec.ts'));
    loadTestFile(require.resolve('./apm_indices/apm_indices.spec.ts'));
    loadTestFile(require.resolve('./custom_link/custom_link.spec.ts'));
  });
}
