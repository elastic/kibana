/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Privileges', function () {
    loadTestFile(require.resolve('./rule_privileges'));
    loadTestFile(require.resolve('./privileges'));
    loadTestFile(require.resolve('./serverless_only_privileges'));
    loadTestFile(require.resolve('./ess_only_privileges'));
  });
}
