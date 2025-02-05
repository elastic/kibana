/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('custom_dashboards', () => {
    loadTestFile(require.resolve('./dependency_metrics.spec.ts'));
    loadTestFile(require.resolve('./metadata.spec.ts'));
    loadTestFile(require.resolve('./top_dependencies.spec.ts'));
    loadTestFile(require.resolve('./top_operations.spec.ts'));
    loadTestFile(require.resolve('./top_spans.spec.ts'));
    loadTestFile(require.resolve('./upstream_services.spec.ts'));
  });
}
