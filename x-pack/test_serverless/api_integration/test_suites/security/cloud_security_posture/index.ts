/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('cloud_security_posture', function () {
    this.tags(['cloud_security_posture']);
    loadTestFile(require.resolve('./status/status_not_deployed_not_installed'));
    loadTestFile(require.resolve('./status/status_indexed'));
    loadTestFile(require.resolve('./status/status_indexing'));
    loadTestFile(require.resolve('./benchmark/v1'));
    loadTestFile(require.resolve('./benchmark/v2'));
    loadTestFile(require.resolve('./find_csp_benchmark_rule'));
    loadTestFile(require.resolve('./telemetry'));
    loadTestFile(require.resolve('./serverless_metering/cloud_security_metering'));

    // TODO: migrate status_unprivileged tests from stateful, if it feasible in serverless with the new security model
    // loadTestFile(require.resolve('./status/status_unprivileged'));

    // TODO: migrate tests relying on fleet_api_integration helpers  from stateful
    // loadTestFile(require.resolve('./status/status_waiting_for_results'));
    // loadTestFile(require.resolve('./status/status_index_timeout'));
  });
}
