/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic APM API integration tests - Group 2', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/apm/errors'));
    loadTestFile(require.resolve('../../apis/apm/historical_data'));
    loadTestFile(require.resolve('../../apis/apm/infrastructure'));
    loadTestFile(require.resolve('../../apis/apm/inspect'));
    loadTestFile(require.resolve('../../apis/apm/latency'));
    loadTestFile(require.resolve('../../apis/apm/metrics'));
    loadTestFile(require.resolve('../../apis/apm/mobile'));
    loadTestFile(require.resolve('../../apis/apm/observability_overview'));
    loadTestFile(require.resolve('../../apis/apm/service_groups'));
    loadTestFile(require.resolve('../../apis/apm/service_maps'));
  });
}
