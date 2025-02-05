/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Custom Threshold rule', () => {
    loadTestFile(require.resolve('./avg_pct_fired'));
    loadTestFile(require.resolve('./avg_pct_no_data'));
    loadTestFile(require.resolve('./avg_ticks_fired'));
    loadTestFile(require.resolve('./cardinality_runtime_field_fired'));
    loadTestFile(require.resolve('./custom_eq_avg_bytes_fired'));
    loadTestFile(require.resolve('./documents_count_fired'));
    loadTestFile(require.resolve('./group_by_fired'));
    loadTestFile(require.resolve('./p99_pct_fired'));
    loadTestFile(require.resolve('./rate_bytes_fired'));
  });
}
