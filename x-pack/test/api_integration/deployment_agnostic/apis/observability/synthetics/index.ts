/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Synthetics', () => {
    loadTestFile(require.resolve('./create_monitor'));
    loadTestFile(require.resolve('./create_monitor_private_location'));
    loadTestFile(require.resolve('./create_monitor_project'));
    loadTestFile(require.resolve('./create_monitor_project_private_location'));
    loadTestFile(require.resolve('./create_monitor_public_api'));
    loadTestFile(require.resolve('./create_update_params'));
    loadTestFile(require.resolve('./delete_monitor_project'));
    loadTestFile(require.resolve('./delete_monitor'));
  });
}
