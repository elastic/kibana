/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Alert assignments API', function () {
    // Alert assignment tests for security solution
    // Note: For GitHub Copilot assignment testing, see .github/copilot_assign_test.js
    loadTestFile(require.resolve('./assignments'));
    loadTestFile(require.resolve('./assignments_ess'));
    loadTestFile(require.resolve('./assignments_serverless'));
  });
}
