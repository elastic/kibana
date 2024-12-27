/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('transactions', () => {
    loadTestFile(require.resolve('./breakdown.spec.ts'));
    loadTestFile(require.resolve('./error_rate.spec.ts'));
    loadTestFile(require.resolve('./latency_overall_distribution.spec.ts'));
    loadTestFile(require.resolve('./latency.spec.ts'));
    loadTestFile(require.resolve('./transactions_groups_alerts.spec.ts'));
    loadTestFile(require.resolve('./transactions_groups_detailed_statistics.spec.ts'));
    loadTestFile(require.resolve('./transactions_groups_main_statistics.spec.ts'));
    loadTestFile(require.resolve('./trace_samples.spec.ts'));
  });
}
