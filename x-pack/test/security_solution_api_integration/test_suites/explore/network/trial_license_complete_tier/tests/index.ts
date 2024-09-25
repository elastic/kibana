/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';

export default function ({ loadTestFile }: FtrProviderContextWithSpaces) {
  describe('@ess @serverless SecuritySolution Explore Network', () => {
    loadTestFile(require.resolve('./network_details'));
    loadTestFile(require.resolve('./network_dns'));
    loadTestFile(require.resolve('./network_top_n_flow'));
    loadTestFile(require.resolve('./tls'));
  });
}
