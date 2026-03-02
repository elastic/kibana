/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic Synthetics API integration tests - Group 1', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/synthetics/legacy_and_multispace_monitor_api'));
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor_private_location'));
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor_project_private_location'));
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor_project'));
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor_project_multi_space.ts'));
    loadTestFile(
      require.resolve('../../apis/synthetics/create_monitor_public_api_private_location')
    );
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor_public_api'));
    loadTestFile(require.resolve('../../apis/synthetics/create_monitor'));
    loadTestFile(require.resolve('../../apis/synthetics/create_update_delete_params'));
    loadTestFile(require.resolve('../../apis/synthetics/delete_monitor_project'));
  });
}
