/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('metrics', () => {
    loadTestFile(require.resolve('./metrics_charts.spec.ts'));
    loadTestFile(require.resolve('./memory/memory_metrics.spec.ts'));
    loadTestFile(require.resolve('./serverless/serverless_active_instances.spec.ts'));
    loadTestFile(require.resolve('./serverless/serverless_functions_overview.spec.ts'));
    loadTestFile(require.resolve('./serverless/serverless_metrics_charts.spec.ts'));
    loadTestFile(require.resolve('./serverless/serverless_summary.spec.ts'));
  });
}
