/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic Synthetics API integration tests - Group 2', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/synthetics/delete_monitor'));
    loadTestFile(require.resolve('../../apis/synthetics/edit_monitor_private_location'));
    loadTestFile(require.resolve('../../apis/synthetics/edit_monitor_public_api_private_location'));
    loadTestFile(require.resolve('../../apis/synthetics/edit_monitor_public_api'));
    loadTestFile(require.resolve('../../apis/synthetics/edit_monitor'));
    loadTestFile(require.resolve('../../apis/synthetics/enable_default_alerting'));
    loadTestFile(require.resolve('../../apis/synthetics/get_filters'));
    loadTestFile(require.resolve('../../apis/synthetics/get_monitor_project'));
    loadTestFile(require.resolve('../../apis/synthetics/get_monitor'));
  });
}
