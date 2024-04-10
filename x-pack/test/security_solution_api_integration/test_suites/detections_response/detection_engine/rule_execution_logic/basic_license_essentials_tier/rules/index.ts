/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext): void => {
  describe('Detection Engine - rule execution', function () {
    // loadTestFile(require.resolve('./new_terms'));
    // loadTestFile(require.resolve('./eql'));
    // loadTestFile(require.resolve('./esql'));
    // loadTestFile(require.resolve('./query'));
    // loadTestFile(require.resolve('./query_ess'));
    // loadTestFile(require.resolve('./saved_query'));
    // loadTestFile(require.resolve('./threat_match'));
    loadTestFile(require.resolve('./threshold'));
  });
};
