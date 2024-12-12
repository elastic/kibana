/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Stateful Observability - Deployment-agnostic API integration tests', () => {
    // load new oblt (except APM) deployment-agnostic tests here
    loadTestFile(require.resolve('../../apis/observability/alerting'));
    loadTestFile(require.resolve('../../apis/observability/dataset_quality'));
    loadTestFile(require.resolve('../../apis/observability/slo'));
    loadTestFile(require.resolve('../../apis/observability/synthetics'));
    loadTestFile(require.resolve('../../apis/observability/infra'));
  });
}
