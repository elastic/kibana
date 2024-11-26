/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('alerts', () => {
    loadTestFile(require.resolve('./error_count_threshold.spec.ts'));
    loadTestFile(require.resolve('./preview_chart_error_count.spec.ts'));
    loadTestFile(require.resolve('./preview_chart_error_rate.spec.ts'));
    loadTestFile(require.resolve('./preview_chart_transaction_duration.spec.ts'));
    loadTestFile(require.resolve('./transaction_duration.spec.ts'));
    loadTestFile(require.resolve('./transaction_error_rate.spec.ts'));
  });
}
