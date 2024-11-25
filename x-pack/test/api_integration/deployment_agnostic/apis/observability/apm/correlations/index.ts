/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('correlations', () => {
    loadTestFile(require.resolve('./failed_transactions.spec.ts'));
    loadTestFile(require.resolve('./field_candidates.spec.ts'));
    loadTestFile(require.resolve('./field_value_pairs.spec.ts'));
    loadTestFile(require.resolve('./latency.spec.ts'));
    loadTestFile(require.resolve('./p_values.spec.ts'));
  });
}
