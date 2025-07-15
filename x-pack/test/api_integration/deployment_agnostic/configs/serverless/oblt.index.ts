/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic API integration tests', function () {
    // load new oblt deployment-agnostic test here
    // Note: if your tests runtime is over 5 minutes, create a new index and config file
    loadTestFile(require.resolve('../../apis/observability/infra'));
    loadTestFile(require.resolve('../../apis/observability/alerting'));
    loadTestFile(require.resolve('../../apis/observability/dataset_quality'));
    loadTestFile(require.resolve('../../apis/observability/slo'));
    loadTestFile(require.resolve('../../apis/observability/incident_management'));
  });
}
