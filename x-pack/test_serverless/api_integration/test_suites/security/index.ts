/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Serverless security API', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./telemetry/snapshot_telemetry'));
    loadTestFile(require.resolve('./telemetry/telemetry_config'));
    loadTestFile(require.resolve('./fleet/fleet'));
    loadTestFile(require.resolve('./cases'));
    loadTestFile(require.resolve('./cloud_security_posture'));
  });
}
