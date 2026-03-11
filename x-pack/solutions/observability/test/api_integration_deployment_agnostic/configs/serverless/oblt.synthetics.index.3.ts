/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Serverless Observability - Deployment-agnostic Synthetics API integration tests - Group 3', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('../../apis/synthetics/inspect_monitor'));
    loadTestFile(require.resolve('../../apis/synthetics/suggestions.ts'));
    loadTestFile(require.resolve('../../apis/synthetics/sync_global_params'));
    loadTestFile(require.resolve('../../apis/synthetics/sync_global_params_for_filtered_monitors'));
    loadTestFile(require.resolve('../../apis/synthetics/synthetics_enablement'));
    loadTestFile(require.resolve('../../apis/synthetics/test_now_monitor'));
    loadTestFile(require.resolve('../../apis/synthetics/edit_private_location'));
    loadTestFile(require.resolve('../../apis/synthetics/get_private_location_monitors'));
    loadTestFile(require.resolve('../../apis/synthetics/clean_up_extra_package_policies'));
  });
}
