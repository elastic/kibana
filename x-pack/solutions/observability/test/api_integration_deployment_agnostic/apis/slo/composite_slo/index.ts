/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('Composite SLO', () => {
    loadTestFile(require.resolve('./create_composite_slo'));
    loadTestFile(require.resolve('./get_composite_slo'));
    loadTestFile(require.resolve('./find_composite_slo'));
    loadTestFile(require.resolve('./update_composite_slo'));
    loadTestFile(require.resolve('./delete_composite_slo'));
  });
}
