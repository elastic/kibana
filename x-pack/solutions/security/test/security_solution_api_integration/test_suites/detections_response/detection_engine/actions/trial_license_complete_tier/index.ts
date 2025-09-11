/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('Actions APIs - Trial License/Complete Tier', function () {
    loadTestFile(require.resolve('./add_actions'));
    loadTestFile(require.resolve('./update_actions'));
    loadTestFile(require.resolve('./migrations'));
    loadTestFile(require.resolve('./throttle'));
    loadTestFile(require.resolve('./check_privileges'));
  });
}
