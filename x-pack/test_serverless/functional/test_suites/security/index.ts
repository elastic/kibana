/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  const isCloud = !!process.env.TEST_CLOUD;

  describe('serverless security UI', function () {
    this.tags(['esGate']);

    loadTestFile(require.resolve('./ftr/navigation'));
    loadTestFile(require.resolve('./ftr/cases'));
    loadTestFile(require.resolve('./ftr/advanced_settings'));
    loadTestFile(require.resolve('./ml'));
    if (isCloud) {
      // only run the agentless API tests in the Serverless Quality Gates
      loadTestFile(
        require.resolve(
          './ftr/cloud_security_posture/agentless/agentless_mki_serverless_quality_gates.ts'
        )
      );
    }
  });
}
