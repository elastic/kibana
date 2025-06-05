/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic Synthetics Alerting API integration tests', function () {
    loadTestFile(
      require.resolve('../../apis/observability/alerting/synthetics/synthetics_default_rule')
    );
    loadTestFile(
      require.resolve('../../apis/observability/alerting/synthetics/custom_status_rule')
    );
  });
}
