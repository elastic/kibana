/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic APM API integration tests - Group 1', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/apm/agent_explorer'));
    loadTestFile(require.resolve('../../apis/apm/alerts'));
    loadTestFile(require.resolve('../../apis/apm/cold_start'));
    loadTestFile(require.resolve('../../apis/apm/correlations'));
    loadTestFile(require.resolve('../../apis/apm/custom_dashboards'));
    loadTestFile(require.resolve('../../apis/apm/data_view'));
    loadTestFile(require.resolve('../../apis/apm/dependencies'));
    loadTestFile(require.resolve('../../apis/apm/diagnostics'));
    loadTestFile(require.resolve('../../apis/apm/environment'));
    loadTestFile(require.resolve('../../apis/apm/error_rate'));
  });
}
