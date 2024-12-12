/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic API integration tests', function () {
    this.tags(['esGate']);

    // load new oblt (except APM) and platform deployment-agnostic test here
    loadTestFile(require.resolve('../../apis/console'));
    loadTestFile(require.resolve('../../apis/core'));
    loadTestFile(require.resolve('../../apis/management'));
    loadTestFile(require.resolve('../../apis/observability/infra'));
    loadTestFile(require.resolve('../../apis/observability/alerting'));
    loadTestFile(require.resolve('../../apis/observability/dataset_quality'));
    loadTestFile(require.resolve('../../apis/painless_lab'));
    loadTestFile(require.resolve('../../apis/saved_objects_management'));
    loadTestFile(require.resolve('../../apis/observability/slo'));
    loadTestFile(require.resolve('../../apis/observability/synthetics'));
  });
}
