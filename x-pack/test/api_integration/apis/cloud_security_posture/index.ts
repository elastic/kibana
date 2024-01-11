/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture']);
    loadTestFile(require.resolve('./status/status_not_deployed_not_installed'));
    loadTestFile(require.resolve('./status/status_indexed'));
    loadTestFile(require.resolve('./status/status_waiting_for_results'));
    loadTestFile(require.resolve('./status/status_index_timeout'));
    loadTestFile(require.resolve('./status/status_unprivileged'));
    loadTestFile(require.resolve('./status/status_indexing'));
    loadTestFile(require.resolve('./benchmark/v1'));
    loadTestFile(require.resolve('./benchmark/v2'));
    loadTestFile(require.resolve('./rules/v1'));
    loadTestFile(require.resolve('./rules/v2'));

    // Place your tests files under this directory and add the following here:
    // loadTestFile(require.resolve('./your test name'));
  });
}
