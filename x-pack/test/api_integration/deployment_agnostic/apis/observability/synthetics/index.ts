/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('SyntheticsAPITests', () => {
    loadTestFile(require.resolve('./legacy_and_multispace_monitor_api'));
    loadTestFile(require.resolve('./create_monitor_private_location'));
    loadTestFile(require.resolve('./create_monitor_project_private_location'));
    loadTestFile(require.resolve('./create_monitor_project'));
    loadTestFile(require.resolve('./create_monitor_public_api_private_location'));
    loadTestFile(require.resolve('./create_monitor_public_api'));
    loadTestFile(require.resolve('./create_monitor'));
    loadTestFile(require.resolve('./create_update_params'));
    loadTestFile(require.resolve('./delete_monitor_project'));
    loadTestFile(require.resolve('./delete_monitor'));
    loadTestFile(require.resolve('./edit_monitor_private_location'));
    loadTestFile(require.resolve('./edit_monitor_public_api_private_location'));
    loadTestFile(require.resolve('./edit_monitor_public_api'));
    loadTestFile(require.resolve('./edit_monitor'));
    loadTestFile(require.resolve('./enable_default_alerting'));
    loadTestFile(require.resolve('./get_filters'));
    loadTestFile(require.resolve('./get_monitor_project'));
    loadTestFile(require.resolve('./get_monitor'));
    loadTestFile(require.resolve('./inspect_monitor'));
    loadTestFile(require.resolve('./suggestions.ts'));
    loadTestFile(require.resolve('./sync_global_params'));
    loadTestFile(require.resolve('./synthetics_enablement'));
    loadTestFile(require.resolve('./test_now_monitor'));
    loadTestFile(require.resolve('./get_private_location_monitors'));
    loadTestFile(require.resolve('./edit_private_location'));
  });
}
