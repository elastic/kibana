/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Streams Endpoints', () => {
    loadTestFile(require.resolve('./full_flow'));
    loadTestFile(require.resolve('./enrichment'));
    loadTestFile(require.resolve('./classic'));
    loadTestFile(require.resolve('./flush_config'));
    loadTestFile(require.resolve('./assets/dashboard'));
    loadTestFile(require.resolve('./schema'));
    loadTestFile(require.resolve('./processing_simulate'));
    loadTestFile(require.resolve('./root_stream'));
    loadTestFile(require.resolve('./group_streams'));
    loadTestFile(require.resolve('./lifecycle'));
  });
}
