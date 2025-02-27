/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Traces', () => {
    loadTestFile(require.resolve('./large_trace/large_trace.spec.ts'));
    loadTestFile(require.resolve('./critical_path.spec.ts'));
    loadTestFile(require.resolve('./find_traces.spec.ts'));
    loadTestFile(require.resolve('./span_details.spec.ts'));
    loadTestFile(require.resolve('./top_traces.spec.ts'));
    loadTestFile(require.resolve('./trace_by_id.spec.ts'));
    loadTestFile(require.resolve('./transaction_details.spec.ts'));
  });
}
