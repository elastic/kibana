/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: DeploymentAgnosticFtrProviderContext) {
  describe('SLO', () => {
    loadTestFile(require.resolve('./create_slo'));
    loadTestFile(require.resolve('./delete_slo'));
    loadTestFile(require.resolve('./get_slo'));
    loadTestFile(require.resolve('./find_slo'));
    loadTestFile(require.resolve('./reset_slo'));
    loadTestFile(require.resolve('./update_slo'));
  });
}
